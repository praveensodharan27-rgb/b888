const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get wallet balance
router.get('/balance', authenticate, async (req, res) => {
  try {
    let wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Latest 10 transactions
        }
      }
    });

    // Create wallet if it doesn't exist
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: req.user.id,
          balance: 0
        },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });
    }

    res.json({
      success: true,
      balance: wallet.balance,
      transactions: wallet.transactions
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch wallet balance' });
  }
});

// Get wallet transactions
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id }
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: req.user.id,
          balance: 0
        }
      });
    }

    const where = { walletId: wallet.id };
    if (type && (type === 'CREDIT' || type === 'DEBIT')) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.walletTransaction.count({ where })
    ]);

    res.json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

// Get wallet statement (detailed financial statement)
router.get('/statement', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, type, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id }
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: req.user.id,
          balance: 0
        }
      });
    }

    const where = { walletId: wallet.id };
    
    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Type filter
    if (type && (type === 'CREDIT' || type === 'DEBIT')) {
      where.type = type;
    }

    const [transactions, total, creditTotal, debitTotal] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          paymentOrder: {
            select: {
              id: true,
              orderId: true,
              amount: true,
              currency: true,
              status: true
            }
          }
        }
      }),
      prisma.walletTransaction.count({ where }),
      prisma.walletTransaction.aggregate({
        where: { ...where, type: 'CREDIT' },
        _sum: { amount: true }
      }),
      prisma.walletTransaction.aggregate({
        where: { ...where, type: 'DEBIT' },
        _sum: { amount: true }
      })
    ]);

    // Calculate opening balance (balance before startDate if provided)
    let openingBalance = wallet.balance;
    if (startDate) {
      const beforeStartDate = await prisma.walletTransaction.aggregate({
        where: {
          walletId: wallet.id,
          createdAt: { lt: new Date(startDate) }
        },
        _sum: {
          amount: true
        }
      });
      // Opening balance = current balance - transactions in date range
      const rangeTotal = (creditTotal._sum.amount || 0) - (debitTotal._sum.amount || 0);
      openingBalance = wallet.balance - (rangeTotal / 100); // Convert from paise
    }

    res.json({
      success: true,
      statement: {
        walletId: wallet.id,
        openingBalance: openingBalance,
        closingBalance: wallet.balance,
        period: {
          startDate: startDate || null,
          endDate: endDate || null
        },
        summary: {
          totalCredits: (creditTotal._sum.amount || 0) / 100, // Convert from paise
          totalDebits: (debitTotal._sum.amount || 0) / 100, // Convert from paise
          netAmount: ((creditTotal._sum.amount || 0) - (debitTotal._sum.amount || 0)) / 100
        },
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get wallet statement error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch wallet statement' });
  }
});

// Download wallet statement as PDF (placeholder - would need PDF generation library)
router.get('/statement/download', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // For now, return JSON. In production, generate PDF using libraries like pdfkit or puppeteer
    res.status(501).json({
      success: false,
      message: 'PDF download not yet implemented. Please use /statement endpoint for JSON data.'
    });
  } catch (error) {
    console.error('Download wallet statement error:', error);
    res.status(500).json({ success: false, message: 'Failed to download statement' });
  }
});

module.exports = router;

