const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Send contact request
router.post('/', authenticate, async (req, res) => {
  try {
    const { sellerId, adId, message } = req.body;
    const requesterId = req.user.id;

    // Validate sellerId
    if (!sellerId) {
      return res.status(400).json({ success: false, message: 'Seller ID is required' });
    }

    // Check if requesting contact with self
    if (requesterId === sellerId) {
      return res.status(400).json({ success: false, message: 'Cannot request contact with yourself' });
    }

    // Check if seller exists
    const seller = await prisma.user.findUnique({
      where: { id: sellerId }
    });

    if (!seller) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already requested
    // For null adId (profile requests), use findFirst as findUnique may not work well with nulls
    const normalizedAdId = adId || null;
    let existing = null;
    
    if (normalizedAdId === null) {
      // For profile requests (null adId), use findFirst
      existing = await prisma.contactRequest.findFirst({
        where: {
          requesterId,
          sellerId,
          adId: null
        }
      });
    } else {
      // For ad-specific requests, use findUnique
      try {
        existing = await prisma.contactRequest.findUnique({
          where: {
            requesterId_sellerId_adId: {
              requesterId,
              sellerId,
              adId: normalizedAdId
            }
          }
        });
      } catch (findError) {
        // Fallback to findFirst if findUnique fails
        existing = await prisma.contactRequest.findFirst({
          where: {
            requesterId,
            sellerId,
            adId: normalizedAdId
          }
        });
      }
    }

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: existing.status === 'PENDING' ? 'Contact request already sent' : 'Contact already shared'
      });
    }

    // Check if blocked
    const isBlocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: requesterId, blockedId: sellerId },
          { blockerId: sellerId, blockedId: requesterId }
        ]
      }
    });

    if (isBlocked) {
      return res.status(403).json({ success: false, message: 'You cannot contact this user' });
    }

    // Create contact request
    const contactRequest = await prisma.contactRequest.create({
      data: {
        requesterId,
        sellerId,
        adId: normalizedAdId,
        message: message || null,
        status: 'PENDING'
      }
    });

    // Create notification for seller
    try {
      await prisma.notification.create({
        data: {
          userId: sellerId,
          type: 'CONTACT_REQUEST',
          title: 'New Contact Request',
          message: `${req.user.name || 'Someone'} wants to contact you`,
          link: `/contact-requests`
        }
      });
    } catch (notifError) {
      console.error('Notification creation error:', notifError);
    }

    res.json({ success: true, contactRequest });
  } catch (error) {
    console.error('Send contact request error:', error);
    
    // Provide more specific error messages
    if (error.code === 'P2002') {
      // Unique constraint violation
      return res.status(400).json({ 
        success: false, 
        message: 'Contact request already exists for this user' 
      });
    }
    
    if (error.code === 'P2003') {
      // Foreign key constraint violation
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user or ad ID' 
      });
    }
    
    const errorMessage = error.message || 'Failed to send contact request';
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { error: error.stack })
    });
  }
});

// Check contact request status between current user and another user
router.get('/check/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.id;

    // Find the most recent contact request between these users (without adId for profile requests)
    const request = await prisma.contactRequest.findFirst({
      where: {
        requesterId,
        sellerId: userId,
        adId: null // Profile-based contact requests have null adId
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!request) {
      return res.json({ success: true, status: 'none' });
    }

    res.json({ success: true, status: request.status.toLowerCase() });
  } catch (error) {
    console.error('Check contact request error:', error);
    res.status(500).json({ success: false, message: 'Failed to check contact request' });
  }
});

// Get pending contact requests (for seller)
router.get('/pending', authenticate, async (req, res) => {
  try {
    const requests = await prisma.contactRequest.findMany({
      where: {
        sellerId: req.user.id,
        status: 'PENDING'
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            avatar: true,
            isVerified: true
          }
        },
        ad: {
          select: {
            id: true,
            title: true,
            images: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, requests });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

// Approve contact request (with transaction)
router.post('/:requestId/approve', authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { consentGiven } = req.body;

    if (!consentGiven) {
      return res.status(400).json({ 
        success: false, 
        message: 'You must give consent to share your contact information' 
      });
    }

    const request = await prisma.contactRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: true,
        seller: true,
        ad: true
      }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Contact request not found' });
    }

    if (request.sellerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    // Check for block before approving
    const isBlocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: request.requesterId, blockedId: request.sellerId },
          { blockerId: request.sellerId, blockedId: request.requesterId }
        ]
      }
    });

    if (isBlocked) {
      return res.status(403).json({ success: false, message: 'Cannot approve - user is blocked' });
    }

    // If adId is null (profile-based request), get seller's first active ad
    let actualAdId = request.adId;
    if (!actualAdId) {
      const sellerAd = await prisma.ad.findFirst({
        where: {
          userId: request.sellerId,
          status: 'APPROVED',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!sellerAd) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot approve contact request - seller has no active ads. Chat room requires an ad.' 
        });
      }

      actualAdId = sellerAd.id;
    }

    // Transaction: Update request, create/find chat room, send phone number message
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update contact request to approved
      const updatedRequest = await tx.contactRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          consentGiven: true,
          approvedAt: new Date()
        }
      });

      // 2. Find or create chat room
      const [user1Id, user2Id] = [request.requesterId, request.sellerId].sort();
      
      let chatRoom = await tx.chatRoom.findUnique({
        where: {
          user1Id_user2Id_adId: {
            user1Id,
            user2Id,
            adId: actualAdId
          }
        }
      });

      if (!chatRoom) {
        chatRoom = await tx.chatRoom.create({
          data: {
            user1Id,
            user2Id,
            adId: actualAdId
          }
        });
      }

      // 3. Insert system message with phone number
      const phoneMessage = await tx.chatMessage.create({
        data: {
          roomId: chatRoom.id,
          senderId: request.sellerId,
          receiverId: request.requesterId,
          content: `Contact approved! You can reach ${request.seller.name} at: ${request.seller.phone || 'Phone number not available'}`,
          type: 'SYSTEM',
          isRead: false
        }
      });

      return { updatedRequest, chatRoom, phoneMessage };
    });

    // 4. Send notification after transaction commits
    try {
      await prisma.notification.create({
        data: {
          userId: request.requesterId,
          type: 'CONTACT_APPROVED',
          title: 'Contact Request Approved',
          message: `${request.seller.name} has shared their contact information with you`,
          link: `/chat?roomId=${result.chatRoom.id}`
        }
      });

      // TODO: Send push notification and socket event here
      // io.to(request.requesterId).emit('contact_approved', result);
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    res.json({ 
      success: true, 
      contactRequest: result.updatedRequest,
      chatRoom: result.chatRoom
    });
  } catch (error) {
    console.error('Approve contact request error:', error);
    
    // Provide more specific error messages
    if (error.code === 'P2002') {
      // Unique constraint violation
      return res.status(400).json({ 
        success: false, 
        message: 'Chat room already exists for these users' 
      });
    }
    
    if (error.code === 'P2003') {
      // Foreign key constraint violation
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user or ad ID' 
      });
    }
    
    const errorMessage = error.message || 'Failed to approve contact request';
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { error: error.stack })
    });
  }
});

// Reject contact request
router.post('/:requestId/reject', authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await prisma.contactRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Contact request not found' });
    }

    if (request.sellerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updatedRequest = await prisma.contactRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date()
      }
    });

    res.json({ success: true, contactRequest: updatedRequest });
  } catch (error) {
    console.error('Reject contact request error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject contact request' });
  }
});

module.exports = router;

