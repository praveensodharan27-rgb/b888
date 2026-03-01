/**
 * AI Sales Assistant Service — smart sales assistant for OLX-style marketplace.
 * Manglish replies, intent-based, friendly. Free for all users.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `You are NOT an AI assistant. You are a real human (the seller) chatting inside a marketplace app like OLX or WhatsApp. Your messages must feel 100% natural, casual, and friendly. Understand the intent of each message before replying.

INTENT RULES:
1. If the user sends casual messages like "hi", "hello", "ok", "fine", "🙂" → Reply casually and shortly. DO NOT talk about the product. Continue natural small talk only.
2. Only talk about the product when the user asks about: price, location, availability, condition, delivery, negotiation.
3. Never repeat the same product message again and again.
4. If the user already got the product details (from earlier in the chat), do NOT send it again unless they ask.

CORE CHAT BEHAVIOUR:
- Mirror the user's tone, language, and message length.
- One word message → short one line reply.
- Two line message → short natural reply.
- Never send long paragraphs unless the user does.

CONVERSATION STYLE:
- Mirror the user's message length. One word → one short reply.
- Be friendly and human. Chat like WhatsApp.

TONE & STYLE:
- Talk like a close friend. Casual and relaxed. Warm and positive.
- Use small natural fillers: "ahh", "ohh", "hmm", "okay", "nice", "ayy", "hehe".
- Use emojis sometimes (not always).
- No formal language. No robotic structure.

NEVER say: "How can I assist you?", "Please provide more details", "Thank you for reaching out".

LANGUAGE MIRRORING:
- If the user types in Malayalam → reply in Malayalam. If Manglish → Manglish. If English → English. Match their typing style.

CONVERSATION FLOW:
- Do not jump into selling or explaining.
- Keep the chat going naturally. Ask small friendly follow-ups: "entha cheyyunne?", "evideya?", "busy ano?", "free aano?"
- Make it feel like a real WhatsApp chat.

MARKETPLACE MODE (only when the user asks about price / location / availability / condition / delivery / negotiation):
- Then talk about the product: friendly, confident, use product details from context. Keep it conversational.
- Examples: User "price?" → "₹45k aanu 🙂 kurachu negotiate cheyyam". User "evideya?" → "Bangalore aanu 📍 ningal evide?"

HUMAN CHAT REALISM:
- Vary your replies. Sometimes very short. Sometimes just an emoji. React to user mood.

EXAMPLES:
User: hi → Reply: Heyy 😊
User: ok fine → Reply: okayy 👍
User: 🙂 → Reply: 😄
User: price? → Reply: ₹45k aanu 🙂 kurachu negotiate cheyyam
User: evideya? → Reply: Bangalore aanu 📍 ningal evide?

ABSOLUTE RULES:
- Do not force sales. Do not repeat product details without a reason.
- Never sound like customer support or AI. Keep it short, real, and human.

PERSONALITY: Friendly, chill, supportive, fun to chat with, smart but simple.

You will receive the product details and the recent chat. The last message is the buyer's — reply to that only. Output ONLY the reply text (1–2 lines max). No JSON, no labels, no quotes.`;

/**
 * Get time-based greeting (optional, for context in prompt)
 */
function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

/**
 * Check if user has active Business Package (same logic as ad posting)
 */
async function hasActiveBusinessPackage(userId) {
  const now = new Date();
  const count = await prisma.businessPackage.count({
    where: {
      userId,
      status: { in: ['paid', 'verified'] },
      expiresAt: { gt: now },
    },
  });
  return count > 0;
}

/**
 * Fetch room, ad, and recent messages. Ensure requester is the seller (ad owner).
 */
async function getRoomContext(roomId, sellerId) {
  const room = await prisma.chatRoom.findUnique({
    where: { id: String(roomId) },
    include: {
      ad: {
        select: {
          id: true,
          userId: true,
          title: true,
          price: true,
          condition: true,
          city: true,
          state: true,
          neighbourhood: true,
          location: { select: { name: true, city: true, state: true } },
        },
      },
      user1: { select: { id: true, name: true } },
      user2: { select: { id: true, name: true } },
    },
  });

  if (!room) return null;
  const adOwnerId = room.ad?.userId;
  if (!adOwnerId || adOwnerId !== sellerId) return null;

  const messages = await prisma.chatMessage.findMany({
    where: { roomId: String(roomId) },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      sender: { select: { id: true, name: true } },
    },
  });

  return {
    room,
    ad: room.ad,
    messages: messages.reverse(),
    buyerId: room.user1Id === sellerId ? room.user2Id : room.user1Id,
  };
}

/**
 * Build user prompt for OpenAI from ad + conversation
 */
function buildUserPrompt(ad, messages, buyerName) {
  const loc = ad?.location?.name || ad?.city || ad?.neighbourhood || ad?.state || 'Location not set';
  const price = ad?.price != null ? `₹${Number(ad.price).toLocaleString('en-IN')}` : 'Price not set';
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastActivityAt = lastMsg?.createdAt ? new Date(lastMsg.createdAt).toISOString() : null;

  const lines = [
    '--- SELLER CONTEXT (you are replying as the seller) ---',
    `Product: ${ad?.title || 'N/A'}`,
    `Price: ${price}`,
    `Location: ${loc}`,
    `Condition: ${ad?.condition || 'Not specified'}`,
    '',
    '--- CONTEXT ---',
    `Conversation has ${messages.length} message(s). Use time-based greeting ONLY if this is the start (first 1-2 messages) OR last activity was 12+ hours ago.${lastActivityAt ? ` Last message at: ${lastActivityAt}.` : ''}`,
    '',
    '--- RECENT CHAT (newest at bottom) ---',
  ];
  messages.forEach((m) => {
    const who = m.senderId === ad?.userId ? 'Seller' : (buyerName || 'Buyer');
    lines.push(`${who}: ${m.content}`);
  });
  lines.push('', '--- Reply as the seller: match buyer language (Malayalam/Manglish/English), 1-2 lines max, natural and human. No JSON. ---');
  return lines.join('\n');
}

/**
 * Call OpenAI and return reply text
 */
async function getOpenAIReply(openAiKey, userPrompt) {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 150,
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || null;
}

const HUMAN_OVERRIDE_MINUTES = 30;

/**
 * Generate sales assistant reply for a chat room.
 * Free for all users: when seller is offline or not viewing this chat, AI replies for them.
 * Stays silent for 30 minutes after seller sends a manual message.
 * @param {string} roomId - Chat room ID
 * @param {string} sellerId - User ID of the seller (must own the ad)
 * @param {string} openAiKey - OPENAI_API_KEY
 * @returns {{ reply: string | null, error?: string }}
 */
async function generateSalesReply(roomId, sellerId, openAiKey) {
  if (!openAiKey || !openAiKey.startsWith('sk-')) {
    return { reply: null, error: 'OpenAI API key not configured or invalid.' };
  }

  // AI chat is free for all users — no Business Package or aiChatEnabled check

  let isOnline = false;
  let viewingRoomId = null;
  try {
    const { isUserOnline, getViewingRoomId } = require('../socket/socket');
    isOnline = isUserOnline(sellerId);
    viewingRoomId = getViewingRoomId(sellerId);
  } catch (_) {
    // Socket not available (e.g. server without socket) — allow AI to reply
  }
  const roomIdStr = String(roomId);
  if (isOnline && viewingRoomId === roomIdStr) {
    return { reply: null, error: 'Seller is online and viewing this chat. AI does not reply.' };
  }

  const ctx = await getRoomContext(roomId, sellerId);
  if (!ctx) {
    return { reply: null, error: 'Room not found or you are not the seller for this chat.' };
  }

  const lastSellerAt = ctx.room.lastSellerMessageAt;
  if (lastSellerAt) {
    const elapsedMs = Date.now() - new Date(lastSellerAt).getTime();
    if (elapsedMs < HUMAN_OVERRIDE_MINUTES * 60 * 1000) {
      return { reply: null, error: 'Human override: seller recently replied. AI stays silent for 30 minutes.' };
    }
  }

  const buyerName = ctx.room.user1Id === sellerId ? ctx.room.user2?.name : ctx.room.user1?.name;
  const userPrompt = buildUserPrompt(ctx.ad, ctx.messages, buyerName);

  try {
    const reply = await getOpenAIReply(openAiKey, userPrompt);
    return { reply: reply || null };
  } catch (e) {
    return { reply: null, error: e.message || 'Failed to generate reply.' };
  }
}

/**
 * If seller is offline or not viewing this chat (and 30min override ok), generate AI reply for all users,
 * save it as a message from the seller, and emit to the room. Call this after a BUYER sends a message.
 * Runs async; does not block. Pass openAiKey from env.
 */
async function triggerAiReplyIfEligible(roomId, sellerId, openAiKey) {
  if (!openAiKey || !openAiKey.startsWith('sk-')) {
    console.log('[AI Chat] Skip: OpenAI API key not set or invalid.');
    return;
  }
  try {
    const result = await generateSalesReply(roomId, sellerId, openAiKey);
    if (!result.reply) {
      if (result.error) {
        console.log('[AI Chat] Skip:', result.error);
      }
      return;
    }

    const roomIdStr = String(roomId);
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomIdStr },
      include: {
        user1: { select: { id: true, name: true, avatar: true } },
        user2: { select: { id: true, name: true, avatar: true } },
      },
    });
    if (!room) return;
    const buyerId = room.user1Id === sellerId ? room.user2Id : room.user1Id;

    const aiMessage = await prisma.chatMessage.create({
      data: {
        content: result.reply,
        type: 'TEXT',
        senderId: sellerId,
        receiverId: buyerId,
        roomId: roomIdStr,
        isAI: true,
      },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    await prisma.chatRoom.update({
      where: { id: roomIdStr },
      data: { updatedAt: new Date() },
    });

    let io;
    try {
      const { getIO } = require('../socket/socket');
      io = getIO();
    } catch (_) {}
    if (io) {
      io.to(`room:${roomIdStr}`).emit('new_message', aiMessage);
      console.log(`🤖 AI reply sent in room ${roomIdStr}`);
    }
  } catch (err) {
    console.error('AI auto-reply error:', err.message || err);
  }
}

module.exports = {
  hasActiveBusinessPackage,
  getRoomContext,
  generateSalesReply,
  getTimeGreeting,
  triggerAiReplyIfEligible,
};
