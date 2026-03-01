const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { MongoClient, ObjectId } = require('mongodb');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

const router = express.Router();

const REPORT_REASONS = ['scam', 'spam', 'inappropriate', 'fake', 'other'];
const REPORT_STATUSES = ['PENDING', 'REVIEWED', 'DISMISSED'];

let reportsCollection = null;
async function getReportsCollection() {
  if (reportsCollection) return reportsCollection;
  const uri = process.env.DATABASE_URL || process.env.MONGO_URI;
  if (!uri) throw new Error('DATABASE_URL or MONGO_URI not set');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  reportsCollection = db.collection('reports');
  await reportsCollection.createIndexes([
    { key: { reporterId: 1 } },
    { key: { adId: 1 } },
    { key: { targetUserId: 1 } },
    { key: { status: 1 } },
    { key: { createdAt: -1 } },
  ]).catch(() => {});
  return reportsCollection;
}

// Submit a report (auth required)
router.post(
  '/',
  authenticate,
  [
    body('reportType').isIn(['AD', 'USER']).withMessage('reportType must be AD or USER'),
    body('reason').isIn(REPORT_REASONS).withMessage(`reason must be one of: ${REPORT_REASONS.join(', ')}`),
    body('message').optional().isString().isLength({ max: 1000 }),
    body('adId').optional().isString(),
    body('targetUserId').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }
      const { reportType, reason, message, adId, targetUserId } = req.body;
      const reporterId = req.user.id;

      if (reportType === 'AD' && !adId) {
        return res.status(400).json({ success: false, message: 'adId is required when reportType is AD' });
      }
      if (reportType === 'USER' && !targetUserId) {
        return res.status(400).json({ success: false, message: 'targetUserId is required when reportType is USER' });
      }

      // Prevent MongoDB operator injection: ensure adId/targetUserId are plain strings (valid ObjectId format)
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      const safeAdId = reportType === 'AD' && adId
        ? (typeof adId === 'string' && objectIdRegex.test(adId) ? adId : null)
        : null;
      const safeTargetUserId = reportType === 'USER' && targetUserId
        ? (typeof targetUserId === 'string' && objectIdRegex.test(targetUserId) ? targetUserId : null)
        : null;
      if (reportType === 'AD' && adId && !safeAdId) {
        return res.status(400).json({ success: false, message: 'Invalid adId format' });
      }
      if (reportType === 'USER' && targetUserId && !safeTargetUserId) {
        return res.status(400).json({ success: false, message: 'Invalid targetUserId format' });
      }

      const coll = await getReportsCollection();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existing = await coll.findOne({
        reporterId,
        reportType,
        ...(reportType === 'AD' ? { adId: safeAdId } : { targetUserId: safeTargetUserId }),
        createdAt: { $gte: oneDayAgo },
      });
      if (existing) {
        return res.status(429).json({
          success: false,
          message: 'You already reported this recently. Please wait 24 hours.',
        });
      }

      const doc = {
        reportType,
        adId: reportType === 'AD' ? safeAdId : null,
        targetUserId: reportType === 'USER' ? safeTargetUserId : null,
        reporterId,
        reason,
        message: message || null,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await coll.insertOne(doc);

      return res.status(201).json({
        success: true,
        message: 'Report submitted. We will review it shortly.',
        report: { id: result.insertedId.toString(), status: 'PENDING' },
      });
    } catch (error) {
      console.error('Report submit error:', error);
      return res.status(500).json({ success: false, message: 'Failed to submit report' });
    }
  }
);

// Admin: list reports
router.get(
  '/admin',
  authenticate,
  authorize('ADMIN'),
  [
    query('status').optional().isIn(REPORT_STATUSES),
    query('reportType').optional().isIn(['AD', 'USER']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const { status, reportType, page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const coll = await getReportsCollection();

      const filter = {};
      if (status) filter.status = status;
      if (reportType) filter.reportType = reportType;

      const [reports, total] = await Promise.all([
        coll.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).toArray(),
        coll.countDocuments(filter),
      ]);

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const enriched = await Promise.all(
        reports.map(async (r) => {
          const [ad, reporter, targetUser] = await Promise.all([
            r.adId ? prisma.ad.findUnique({ where: { id: r.adId }, select: { id: true, title: true, status: true, userId: true } }).catch(() => null) : null,
            prisma.user.findUnique({ where: { id: r.reporterId }, select: { id: true, name: true, email: true } }).catch(() => null),
            r.targetUserId ? prisma.user.findUnique({ where: { id: r.targetUserId }, select: { id: true, name: true, email: true } }).catch(() => null) : null,
          ]);
          return {
            id: r._id.toString(),
            reportType: r.reportType,
            adId: r.adId,
            targetUserId: r.targetUserId,
            reporterId: r.reporterId,
            reason: r.reason,
            message: r.message,
            status: r.status,
            adminNotes: r.adminNotes,
            reviewedAt: r.reviewedAt,
            reviewedBy: r.reviewedBy,
            createdAt: r.createdAt,
            ad,
            reporter,
            targetUser,
          };
        })
      );

      return res.json({
        success: true,
        reports: enriched,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
      });
    } catch (error) {
      console.error('Admin list reports error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch reports' });
    }
  }
);

// Admin: update report status
router.patch(
  '/admin/:id',
  authenticate,
  authorize('ADMIN'),
  [
    body('status').isIn(REPORT_STATUSES).withMessage('Invalid status'),
    body('adminNotes').optional().isString().isLength({ max: 2000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const { id } = req.params;
      const { status, adminNotes } = req.body;
      let oid;
      try {
        oid = new ObjectId(id);
      } catch {
        return res.status(404).json({ success: false, message: 'Report not found' });
      }

      const coll = await getReportsCollection();
      const result = await coll.findOneAndUpdate(
        { _id: oid },
        {
          $set: {
            status,
            adminNotes: adminNotes || undefined,
            reviewedAt: new Date(),
            reviewedBy: req.user.id,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        return res.status(404).json({ success: false, message: 'Report not found' });
      }

      const r = result.value;
      return res.json({
        success: true,
        report: {
          id: r._id.toString(),
          status: r.status,
          adminNotes: r.adminNotes,
          reviewedAt: r.reviewedAt,
        },
      });
    } catch (error) {
      console.error('Admin update report error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update report' });
    }
  }
);

module.exports = router;
