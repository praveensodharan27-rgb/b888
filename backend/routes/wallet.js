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

module.exports = router;

