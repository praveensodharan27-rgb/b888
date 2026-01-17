# Socket.IO Chat API - Complete Guide

**Socket.IO Server URL:** `http://localhost:5000`  
**REST API Base URL:** `http://localhost:5000/api`

---

## 📋 Table of Contents

1. [Connection Setup](#connection-setup)
2. [Chat Events (Client → Server)](#chat-events-client--server)
3. [Chat Events (Server → Client)](#chat-events-server--client)
4. [REST API Endpoints](#rest-api-endpoints)
5. [Complete Code Examples](#complete-code-examples)
6. [Error Handling](#error-handling)

---

## 🔌 Connection Setup

### Backend Configuration

Socket.IO is already configured in `backend/server.js`:
- **Port:** 5000 (same as HTTP server)
- **CORS:** Configured for frontend origins
- **Authentication:** JWT token required

### Frontend Connection

**Using the Helper Function (Recommended):**
```typescript
import { getSocket } from '@/lib/socket';

const socket = getSocket(); // Automatically handles auth and connection
```

**Manual Connection:**
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token' // From login response
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

socket.on('connect', () => {
  console.log('✅ Connected to Socket.IO');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from Socket.IO');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

---

## 📤 CHAT EVENTS (Client → Server)

### 1. Join Chat Room

Join a specific chat room to receive messages.

**Event:** `join_room`

**Payload:**
```typescript
roomId: string // Chat room ID
```

**Example:**
```typescript
socket.emit('join_room', 'room123');
```

**When to use:**
- When opening a chat conversation
- Before sending messages in a room
- When switching between chat rooms

---

### 2. Leave Chat Room

Leave a chat room to stop receiving messages.

**Event:** `leave_room`

**Payload:**
```typescript
roomId: string // Chat room ID
```

**Example:**
```typescript
socket.emit('leave_room', 'room123');
```

**When to use:**
- When closing a chat conversation
- When switching to a different room
- On component unmount

---

### 3. Send Message

Send a chat message in real-time.

**Event:** `send_message`

**Payload:**
```typescript
{
  roomId: string;        // Required: Chat room ID
  content: string;       // Required: Message content
  type?: 'TEXT' | 'IMAGE' | 'SYSTEM'; // Optional: Message type (default: 'TEXT')
  imageUrl?: string;     // Optional: Required if type is 'IMAGE'
}
```

**Example - Text Message:**
```typescript
socket.emit('send_message', {
  roomId: 'room123',
  content: 'Hello! How are you?',
  type: 'TEXT'
});
```

**Example - Image Message:**
```typescript
socket.emit('send_message', {
  roomId: 'room123',
  content: 'Check out this image!',
  type: 'IMAGE',
  imageUrl: 'https://example.com/image.jpg'
});
```

**Response:** Server emits `new_message` to all users in the room.

**Server Behavior:**
- Validates room access
- Saves message to database
- Updates room's `updatedAt` timestamp
- Emits message to all room participants
- Creates notification if receiver is offline

---

### 4. Typing Indicator

Notify other users that you are typing.

**Event:** `typing`

**Payload:**
```typescript
{
  roomId: string; // Chat room ID
}
```

**Example:**
```typescript
socket.emit('typing', { roomId: 'room123' });
```

**When to use:**
- When user starts typing in message input
- Debounce this event (e.g., emit every 1-2 seconds while typing)

**Response:** Server emits `user_typing` to other users in the room.

---

### 5. Stop Typing

Notify other users that you stopped typing.

**Event:** `stop_typing`

**Payload:**
```typescript
{
  roomId: string; // Chat room ID
}
```

**Example:**
```typescript
socket.emit('stop_typing', { roomId: 'room123' });
```

**When to use:**
- When user stops typing (after timeout)
- When user sends a message
- When user clears the input field

**Response:** Server emits `user_stopped_typing` to other users in the room.

---

## 📥 CHAT EVENTS (Server → Client)

### 1. New Message

Receive a new message in a chat room.

**Event:** `new_message`

**Payload:**
```typescript
{
  id: string;              // Message ID
  content: string;          // Message content
  type: 'TEXT' | 'IMAGE' | 'SYSTEM';
  senderId: string;        // Sender user ID
  receiverId: string;      // Receiver user ID
  roomId: string;          // Chat room ID
  imageUrl?: string;       // Image URL (if type is IMAGE)
  createdAt: string;        // ISO timestamp
  sender: {
    id: string;
    name: string;
    avatar: string | null;
  };
}
```

**Example Handler:**
```typescript
socket.on('new_message', (message) => {
  console.log('New message:', message);
  
  // Update messages list
  setMessages(prev => [...prev, message]);
  
  // Scroll to bottom
  scrollToBottom();
  
  // Play notification sound (if not from current user)
  if (message.senderId !== currentUserId) {
    playNotificationSound();
  }
});
```

---

### 2. User Typing

Receive typing indicator from another user.

**Event:** `user_typing`

**Payload:**
```typescript
{
  userId: string;    // User ID who is typing
  roomId: string;    // Chat room ID
}
```

**Example Handler:**
```typescript
socket.on('user_typing', ({ userId, roomId }) => {
  if (roomId === currentRoomId) {
    setTypingUsers(prev => new Set([...prev, userId]));
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }, 3000);
  }
});
```

---

### 3. User Stopped Typing

Receive notification that user stopped typing.

**Event:** `user_stopped_typing`

**Payload:**
```typescript
{
  userId: string;    // User ID who stopped typing
  roomId: string;    // Chat room ID
}
```

**Example Handler:**
```typescript
socket.on('user_stopped_typing', ({ userId, roomId }) => {
  if (roomId === currentRoomId) {
    setTypingUsers(prev => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }
});
```

---

### 4. User Online

Receive notification when a user comes online.

**Event:** `user_online`

**Payload:**
```typescript
{
  userId: string; // User ID who came online
}
```

**Example Handler:**
```typescript
socket.on('user_online', ({ userId }) => {
  setOnlineUsers(prev => new Set([...prev, userId]));
  
  // Update online status in chat list
  updateUserOnlineStatus(userId, true);
});
```

---

### 5. User Offline

Receive notification when a user goes offline.

**Event:** `user_offline`

**Payload:**
```typescript
{
  userId: string; // User ID who went offline
}
```

**Example Handler:**
```typescript
socket.on('user_offline', ({ userId }) => {
  setOnlineUsers(prev => {
    const next = new Set(prev);
    next.delete(userId);
    return next;
  });
  
  // Update online status in chat list
  updateUserOnlineStatus(userId, false);
});
```

---

### 6. Error

Receive error notifications.

**Event:** `error`

**Payload:**
```typescript
{
  message: string; // Error message
}
```

**Example Handler:**
```typescript
socket.on('error', ({ message }) => {
  console.error('Socket error:', message);
  toast.error(message);
});
```

**Common Errors:**
- `"Room not found"` - Invalid room ID
- `"Not authorized"` - User doesn't have access to room
- `"Failed to send message"` - Server error while sending message

---

## 🌐 REST API ENDPOINTS

### 1. Create/Get Chat Room

**`POST /api/chat/room`** (Auth Required)

Create a new chat room or get existing room.

**Request Body:**
```json
{
  "adId": "ad123",           // Optional: Ad ID
  "receiverId": "user456",   // Required: Other user's ID
  "userId": "user456"        // Alternative to receiverId
}
```

**Response:**
```json
{
  "success": true,
  "room": {
    "id": "room123",
    "user1Id": "user123",
    "user2Id": "user456",
    "adId": "ad123",
    "createdAt": "2024-01-15T10:30:00Z",
    "user1": { "id": "user123", "name": "John", "avatar": "..." },
    "user2": { "id": "user456", "name": "Jane", "avatar": "..." },
    "ad": { "id": "ad123", "title": "Product", "images": [...] }
  }
}
```

---

### 2. Get User's Chat Rooms

**`GET /api/chat/rooms`** (Auth Required)

Get all chat rooms for the current user.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "rooms": [
    {
      "id": "room123",
      "user1Id": "user123",
      "user2Id": "user456",
      "adId": "ad123",
      "updatedAt": "2024-01-15T10:30:00Z",
      "lastMessage": {
        "content": "Hello!",
        "createdAt": "2024-01-15T10:30:00Z"
      },
      "otherUser": { "id": "user456", "name": "Jane", "avatar": "..." },
      "ad": { "id": "ad123", "title": "Product" }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### 3. Get Chat Messages

**`GET /api/chat/rooms/:roomId/messages`** (Auth Required)

Get messages for a specific chat room.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg123",
      "content": "Hello!",
      "type": "TEXT",
      "senderId": "user123",
      "receiverId": "user456",
      "roomId": "room123",
      "createdAt": "2024-01-15T10:30:00Z",
      "sender": {
        "id": "user123",
        "name": "John",
        "avatar": "..."
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

**Note:** This endpoint automatically marks messages as read when fetched.

---

### 4. Get Unread Count

**`GET /api/chat/unread-count`** (Auth Required)

Get total unread message count across all rooms.

**Response:**
```json
{
  "success": true,
  "unreadCount": 5
}
```

---

### 5. Mark Message as Read

**`POST /api/chat/messages/:messageId/read`** (Auth Required)

Mark a specific message as read.

**Response:**
```json
{
  "success": true,
  "message": "Message marked as read"
}
```

---

### 6. Mark All Messages as Read

**`POST /api/chat/rooms/:roomId/read-all`** (Auth Required)

Mark all messages in a room as read.

**Response:**
```json
{
  "success": true,
  "message": "All messages marked as read"
}
```

---

### 7. Get Read Receipts

**`GET /api/chat/messages/:messageId/read-receipts`** (Auth Required)

Get read receipts for a specific message.

**Response:**
```json
{
  "success": true,
  "readReceipts": [
    {
      "userId": "user456",
      "readAt": "2024-01-15T10:31:00Z"
    }
  ]
}
```

---

### 8. Get Unread Counts per Room

**`GET /api/chat/rooms/unread-counts`** (Auth Required)

Get unread count for each room.

**Response:**
```json
{
  "success": true,
  "unreadCounts": {
    "room123": 3,
    "room456": 2
  }
}
```

---

### 9. Block User in Chat

**`POST /api/chat/block/:userId`** (Auth Required)

Block a user from chatting.

**Response:**
```json
{
  "success": true,
  "message": "User blocked successfully"
}
```

---

### 10. Get Online Users

**`GET /api/chat/online-users`** (Auth Required)

Get list of currently online user IDs.

**Response:**
```json
{
  "success": true,
  "onlineUsers": ["user123", "user456", "user789"]
}
```

---

## 💻 Complete Code Examples

### React Hook for Chat

```typescript
import { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import api from '@/lib/api';

export function useChat(roomId: string | null) {
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket and join room
  useEffect(() => {
    if (!roomId) return;

    const socket = getSocket();
    if (!socket) return;

    socketRef.current = socket;
    setIsConnected(socket.connected);

    // Join room
    socket.emit('join_room', roomId);

    // Load initial messages
    api.get(`/chat/rooms/${roomId}/messages`)
      .then(res => setMessages(res.data.messages || []))
      .catch(err => console.error('Failed to load messages:', err));

    // Listen for new messages
    const handleNewMessage = (message: any) => {
      if (message.roomId === roomId) {
        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    };

    // Listen for typing indicators
    const handleTyping = ({ userId }: { userId: string }) => {
      setTypingUsers(prev => new Set([...prev, userId]));
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }, 3000);
    };

    const handleStopTyping = ({ userId }: { userId: string }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stopped_typing', handleStopTyping);
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      socket.emit('leave_room', roomId);
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stopped_typing', handleStopTyping);
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [roomId]);

  // Send message
  const sendMessage = (content: string, type: 'TEXT' | 'IMAGE' = 'TEXT', imageUrl?: string) => {
    if (!socketRef.current || !roomId) return;

    socketRef.current.emit('send_message', {
      roomId,
      content,
      type,
      imageUrl
    });

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socketRef.current.emit('stop_typing', { roomId });
  };

  // Typing indicator
  const handleTyping = () => {
    if (!socketRef.current || !roomId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing
    socketRef.current.emit('typing', { roomId });

    // Auto-stop after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', { roomId });
    }, 2000);
  };

  return {
    messages,
    typingUsers,
    isConnected,
    sendMessage,
    handleTyping
  };
}
```

---

### Chat Component Example

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { FiSend } from 'react-icons/fi';

export default function ChatRoom({ roomId }: { roomId: string }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, typingUsers, isConnected, sendMessage, handleTyping } = useChat(roomId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    sendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else {
      handleTyping();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status */}
      <div className={`p-2 text-sm ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`mb-4 ${msg.senderId === currentUserId ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block p-2 rounded-lg ${msg.senderId === currentUserId ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {msg.content}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(msg.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
        
        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="text-gray-500 text-sm italic">
            {Array.from(typingUsers).map(id => `User ${id} is typing...`).join(', ')}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !isConnected}
            className="p-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
          >
            <FiSend />
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## ⚠️ Error Handling

### Connection Errors

```typescript
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error);
  
  // Handle different error types
  if (error.message === 'Authentication error') {
    // Token expired or invalid
    // Redirect to login
    router.push('/login');
  } else {
    // Network error
    toast.error('Failed to connect to chat server');
  }
});
```

### Message Errors

```typescript
socket.on('error', ({ message }) => {
  switch (message) {
    case 'Room not found':
      toast.error('Chat room not found');
      router.push('/chat');
      break;
    case 'Not authorized':
      toast.error('You do not have access to this chat');
      break;
    case 'Failed to send message':
      toast.error('Failed to send message. Please try again.');
      break;
    default:
      toast.error(message);
  }
});
```

---

## 🔒 Security Notes

1. **Authentication Required:** All Socket.IO connections require valid JWT token
2. **Room Access Validation:** Server validates user access to rooms before allowing messages
3. **Message Validation:** Server validates message content and type
4. **Rate Limiting:** Consider implementing rate limiting for message sending
5. **Content Moderation:** Consider adding content moderation for messages

---

## 📚 Related Documentation

- **Complete Socket.IO Guide:** `SOCKET_IO_PAYMENT_ALL_ENDPOINTS.md`
- **All API Endpoints:** `ALL_ENDPOINTS_LIST.md`
- **REST Chat API:** See `/api/chat` endpoints in API documentation

---

**Last Updated:** 2024-01-15


