'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { format } from 'date-fns';
import { FiSend, FiArrowLeft, FiPhone, FiVideo } from 'react-icons/fi';
import ImageWithFallback from '@/components/ImageWithFallback';
import Link from 'next/link';
import WebRTCCall from '@/components/WebRTCCall';

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [hasSentInitialMessage, setHasSentInitialMessage] = useState(false);
  const [activeCall, setActiveCall] = useState<{
    roomId: string;
    callerId: string;
    receiverId: string;
    isIncoming: boolean;
    callerName: string;
    isAudioOnly?: boolean;
  } | null>(null);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Get adId, userId/receiverId, and roomId from query params
  const adIdFromQuery = mounted ? searchParams.get('adId') : null;
  const userIdFromQuery = mounted ? (searchParams.get('userId') || searchParams.get('receiverId')) : null;
  const roomIdFromQuery = mounted ? searchParams.get('roomId') : null;

  // Mutation to create or get chat room
  const createRoomMutation = useMutation({
    mutationFn: async ({ adId, receiverId }: { adId?: string; receiverId: string }) => {
      const payload: any = { userId: receiverId };
      if (adId) {
        payload.adId = adId;
      }
      const response = await api.post('/chat/room', payload);
      return response.data.room;
    },
    onSuccess: (room) => {
      setSelectedRoom(room.id);
      queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] });
      // Mark that we should send initial message (only if coming from ad page)
      if (adIdFromQuery) {
        setHasSentInitialMessage(false);
      }
      // Clear query params after room is created
      router.replace('/chat');
    },
    onError: (error: any) => {
      console.error('Failed to create room:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.[0]?.msg || 
                          'Failed to create chat room. Please try again.';
      alert(errorMessage);
    },
  });

  const { data: rooms } = useQuery({
    queryKey: ['chat', 'rooms'],
    queryFn: async () => {
      const response = await api.get('/chat/rooms');
      return response.data.rooms;
    },
    enabled: isAuthenticated,
  });

  // Fetch online users status
  const { data: onlineUsersData } = useQuery({
    queryKey: ['chat', 'online-users'],
    queryFn: async () => {
      const response = await api.get('/chat/online-users');
      return response.data.onlineUsers || [];
    },
    enabled: isAuthenticated,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Update online users state when data changes
  useEffect(() => {
    if (onlineUsersData) {
      setOnlineUsers(new Set(onlineUsersData));
    }
  }, [onlineUsersData]);

  // Auto-select room if roomId is in query params
  useEffect(() => {
    if (isAuthenticated && roomIdFromQuery && !selectedRoom) {
      setSelectedRoom(roomIdFromQuery);
      router.replace('/chat');
    }
  }, [isAuthenticated, roomIdFromQuery, selectedRoom, router]);

  // Auto-create room if adId and userId are in query params
  useEffect(() => {
    if (isAuthenticated && adIdFromQuery && userIdFromQuery && !selectedRoom && !roomIdFromQuery) {
      // Check if room already exists
      const existingRoom = rooms?.find((room: any) => 
        room.adId === adIdFromQuery && 
        (room.user1Id === userIdFromQuery || room.user2Id === userIdFromQuery)
      );
      
      if (existingRoom) {
        setSelectedRoom(existingRoom.id);
        router.replace('/chat');
      } else {
        createRoomMutation.mutate({ 
          adId: adIdFromQuery, 
          receiverId: userIdFromQuery 
        });
      }
    }
  }, [isAuthenticated, adIdFromQuery, userIdFromQuery, rooms, selectedRoom, roomIdFromQuery, createRoomMutation, router]);

  const { data: messages } = useQuery({
    queryKey: ['chat', 'messages', selectedRoom],
    queryFn: async () => {
      const response = await api.get(`/chat/rooms/${selectedRoom}/messages`);
      // Invalidate unread count when messages are loaded (they're marked as read)
      queryClient.invalidateQueries({ queryKey: ['chat', 'unread-count'] });
      return response.data.messages;
    },
    enabled: !!selectedRoom,
  });

  useEffect(() => {
    if (isAuthenticated) {
      const sock = getSocket();
      setSocket(sock);

      if (sock) {
        // Handle new messages
        sock.on('new_message', (newMessage: any) => {
          const isCurrentUser = newMessage.senderId === user?.id;
          const isCurrentRoom = newMessage.roomId === selectedRoom;
          
          queryClient.setQueryData(['chat', 'messages', newMessage.roomId], (old: any) => {
            if (!old) return [newMessage];
            // Check if message already exists (prevent duplicates)
            if (old.some((msg: any) => msg.id === newMessage.id)) {
              return old;
            }
            return [...old, newMessage];
          });
          queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] });
          queryClient.invalidateQueries({ queryKey: ['chat', 'unread-count'] });
          
          // Play sound and show notification only if:
          // 1. Message is not from current user
          // 2. User is not viewing the current room
          if (!isCurrentUser && !isCurrentRoom) {
            // Play notification sound
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();

              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);

              oscillator.frequency.value = 800;
              oscillator.type = 'sine';

              gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.2);
            } catch (error) {
              // Silent fail if audio is not supported
            }
            
            // Show browser notification if tab is not focused
            if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('New Message', {
                body: `${newMessage.sender?.name || 'Someone'} sent you a message`,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'chat-message',
              });
            }
          }
          
          // Scroll to bottom when new message arrives in current room
          if (isCurrentRoom) {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        });

        // Handle typing indicators
        sock.on('user_typing', (data: { userId: string; roomId: string }) => {
          if (data.roomId === selectedRoom && data.userId !== user?.id) {
            setTypingUsers(prev => new Set(prev).add(data.userId));
          }
        });

        sock.on('user_stopped_typing', (data: { userId: string; roomId: string }) => {
          if (data.roomId === selectedRoom) {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.userId);
              return newSet;
            });
          }
        });

        // Handle connection events
        sock.on('connect', () => {
          console.log('✅ Socket connected');
        });

        sock.on('disconnect', () => {
          console.log('❌ Socket disconnected');
        });

        sock.on('error', (error: any) => {
          console.error('Socket error:', error);
        });

        // Handle user online/offline status
        sock.on('user_online', (data: { userId: string }) => {
          setOnlineUsers(prev => new Set(prev).add(data.userId));
        });

        sock.on('user_offline', (data: { userId: string }) => {
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.userId);
            return newSet;
          });
        });

        // Handle incoming WebRTC call
        sock.on('webrtc_incoming_call', (data: { roomId: string; callerId: string; callerName: string; isAudioOnly?: boolean }) => {
          // Show incoming call regardless of selected room
          const currentRoom = rooms?.find((room: any) => room.id === data.roomId);
          const otherUser = currentRoom 
            ? (currentRoom.user1.id === user?.id ? currentRoom.user2 : currentRoom.user1)
            : null;
          
          setActiveCall({
            roomId: data.roomId,
            callerId: data.callerId,
            receiverId: user?.id || '',
            isIncoming: true,
            callerName: data.callerName || otherUser?.name || 'User',
            isAudioOnly: data.isAudioOnly || false,
          });
        });
      }

      return () => {
        if (sock) {
          sock.off('new_message');
          sock.off('user_typing');
          sock.off('user_stopped_typing');
          sock.off('connect');
          sock.off('disconnect');
          sock.off('error');
          sock.off('user_online');
          sock.off('user_offline');
          sock.off('webrtc_incoming_call');
        }
      };
    }
  }, [isAuthenticated, queryClient, selectedRoom, user?.id, rooms]);

  useEffect(() => {
    if (selectedRoom && socket) {
      socket.emit('join_room', selectedRoom);
      return () => {
        socket.emit('leave_room', selectedRoom);
      };
    }
  }, [selectedRoom, socket]);

  // Auto-send initial message when room is created from ad page
  useEffect(() => {
    if (
      selectedRoom && 
      socket && 
      socket.connected && 
      adIdFromQuery && 
      !hasSentInitialMessage && 
      messages && 
      messages.length === 0
    ) {
      // Wait a bit for everything to be ready
      const timer = setTimeout(() => {
        if (socket && socket.connected && selectedRoom) {
          socket.emit('send_message', {
            roomId: selectedRoom,
            content: 'Is this product available?',
            type: 'TEXT'
          });
          setHasSentInitialMessage(true);
          // Invalidate messages to refresh
          queryClient.invalidateQueries({ queryKey: ['chat', 'messages', selectedRoom] });
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [selectedRoom, socket, adIdFromQuery, hasSentInitialMessage, messages, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicator
  const handleTyping = () => {
    if (!selectedRoom || !socket) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { roomId: selectedRoom });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('stop_typing', { roomId: selectedRoom });
    }, 2000);
  };

  const sendMessage = (customMessage?: string) => {
    const messageToSend = customMessage || message.trim();
    if (!messageToSend || !selectedRoom || !socket) return;

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      socket.emit('stop_typing', { roomId: selectedRoom });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.emit('send_message', {
      roomId: selectedRoom,
      content: messageToSend,
      type: 'TEXT',
    });

    setMessage('');
    
    // Scroll to bottom after sending
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600">Please login to access chat</p>
      </div>
    );
  }

  const currentRoom = rooms?.find((room: any) => room.id === selectedRoom);
  const otherUser = currentRoom 
    ? (currentRoom.user1.id === user?.id ? currentRoom.user2 : currentRoom.user1)
    : null;

  return (
    <>
      {activeCall && (
        <WebRTCCall
          roomId={activeCall.roomId}
          callerId={activeCall.callerId}
          receiverId={activeCall.receiverId}
          isIncoming={activeCall.isIncoming}
          callerName={activeCall.callerName}
          isAudioOnly={activeCall.isAudioOnly}
          onEndCall={() => setActiveCall(null)}
        />
      )}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Messages</h1>

      <div className="flex h-[600px] bg-white rounded-lg shadow">
        <div className="w-1/3 border-r overflow-y-auto">
          {rooms?.map((room: any) => {
            const otherUser = room.user1.id === user?.id ? room.user2 : room.user1;
            const lastMessage = room.messages[0];
            const unreadCount = room._count?.messages || 0;

            return (
              <div
                key={room.id}
                onClick={() => setSelectedRoom(room.id)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedRoom === room.id ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {otherUser.avatar ? (
                    <div className="relative">
                      <ImageWithFallback
                        src={otherUser.avatar}
                        alt={otherUser.name}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                      {onlineUsers.has(otherUser.id) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center relative">
                      {otherUser.name[0]}
                      {onlineUsers.has(otherUser.id) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p 
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/user/${otherUser.id}`);
                      }}
                      className="font-semibold truncate hover:text-primary-600 transition-colors cursor-pointer"
                    >
                      {otherUser.name}
                    </p>
                    {room.ad && (
                      <p className="text-xs text-gray-400 truncate">{room.ad.title}</p>
                    )}
                    {lastMessage && (
                      <p className="text-sm text-gray-500 truncate mt-1">{lastMessage.content}</p>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-1 flex flex-col">
          {selectedRoom && currentRoom ? (
            <>
              {/* Chat Header with Product Info */}
              <div className="border-b p-4 bg-gray-50">
                <div className="flex items-center gap-4">
                  <Link 
                    href={`/ads/${currentRoom.ad.id}`}
                    className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                  >
                    {currentRoom.ad.images && currentRoom.ad.images.length > 0 && (
                      <ImageWithFallback
                        src={currentRoom.ad.images[0]}
                        alt={currentRoom.ad.title}
                        width={60}
                        height={60}
                        className="rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{currentRoom.ad.title}</p>
                      <p className="text-primary-600 font-bold text-sm">
                        ₹{currentRoom.ad.price.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    {otherUser && (
                      <>
                        {otherUser.avatar ? (
                          <div className="relative">
                            <ImageWithFallback
                              src={otherUser.avatar}
                              alt={otherUser.name}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                            {onlineUsers.has(otherUser.id) && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                            )}
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center relative">
                            <span className="text-xs">{otherUser.name[0]}</span>
                            {onlineUsers.has(otherUser.id) && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                            )}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span 
                              onClick={() => router.push(`/user/${otherUser.id}`)}
                              className="text-sm font-medium hover:text-primary-600 transition-colors cursor-pointer"
                            >
                              {otherUser.name}
                            </span>
                            {onlineUsers.has(otherUser.id) && (
                              <span className="w-2 h-2 bg-green-500 rounded-full" title="Online"></span>
                            )}
                          </div>
                          {otherUser.phone && (
                            <a 
                              href={`tel:${otherUser.phone}`}
                              className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FiPhone className="w-3 h-3" />
                              {otherUser.phone}
                            </a>
                          )}
                        </div>
                        {/* Call Buttons */}
                        <div className="flex items-center gap-2 ml-2">
                          <button
                            onClick={() => {
                              if (socket && selectedRoom && otherUser) {
                                socket.emit('webrtc_initiate_call', {
                                  roomId: selectedRoom,
                                  receiverId: otherUser.id,
                                  isAudioOnly: false,
                                });
                                setActiveCall({
                                  roomId: selectedRoom,
                                  callerId: user?.id || '',
                                  receiverId: otherUser.id,
                                  isIncoming: false,
                                  callerName: user?.name || 'You',
                                  isAudioOnly: false,
                                });
                              }
                            }}
                            className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-lg transition-colors"
                            title="Start video call"
                            disabled={!onlineUsers.has(otherUser.id)}
                          >
                            <FiVideo className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              if (socket && selectedRoom && otherUser) {
                                socket.emit('webrtc_initiate_call', {
                                  roomId: selectedRoom,
                                  receiverId: otherUser.id,
                                  isAudioOnly: true,
                                });
                                setActiveCall({
                                  roomId: selectedRoom,
                                  callerId: user?.id || '',
                                  receiverId: otherUser.id,
                                  isIncoming: false,
                                  callerName: user?.name || 'You',
                                  isAudioOnly: true,
                                });
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
                            title="Start audio call"
                            disabled={!onlineUsers.has(otherUser.id)}
                          >
                            <FiPhone className="w-5 h-5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages?.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.senderId === user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.senderId === user?.id
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {msg.type === 'IMAGE' && msg.imageUrl && (
                        <div className="mb-2">
                          <img 
                            src={msg.imageUrl} 
                            alt="Shared image" 
                            className="max-w-full h-auto rounded"
                          />
                        </div>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.senderId === user?.id ? 'opacity-70' : 'opacity-60'}`}>
                        {format(new Date(msg.createdAt), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
                {/* Typing indicator */}
                {typingUsers.size > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                      <div className="flex items-center gap-1">
                        <span className="text-sm">Typing</span>
                        <div className="flex gap-1">
                          <div className="w-1 h-1 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1 h-1 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1 h-1 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Quick Action Buttons - Show when there are few messages, placed above input for easy access */}
              {messages && messages.length <= 3 && currentRoom?.ad && (
                <div className="border-t border-b bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">Quick questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Is this product available?',
                      "What's the best price?",
                      'Can you share more photos?',
                      'Where can I see it?',
                      "What's the condition?",
                      'Is it negotiable?',
                      'When can I pick it up?',
                      'Do you have the original box/receipt?',
                      'Can you share your contact number?'
                    ].map((question) => (
                      <button
                        key={question}
                        onClick={() => sendMessage(question)}
                        className="px-3 py-1.5 text-xs bg-white hover:bg-primary-50 hover:text-primary-700 text-gray-700 rounded-full transition-all border border-gray-300 hover:border-primary-300 shadow-sm"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="border-t p-4">
                <div className="flex gap-2">
                  {/* One-click Share Contact Number Button */}
                  {user?.phone && (
                    <button
                      onClick={() => sendMessage(`My contact number: ${user.phone}`)}
                      className="bg-primary-100 hover:bg-primary-200 text-primary-700 px-3 py-2 rounded-lg transition-all border border-primary-300 flex items-center gap-1.5 text-sm font-medium flex-shrink-0"
                      title="Share my contact number"
                    >
                      <FiPhone className="w-4 h-4" />
                      <span className="hidden sm:inline">Share Number</span>
                    </button>
                  )}
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={() => sendMessage()}
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
                  >
                    <FiSend /> Send
                  </button>
                </div>
              </div>
            </>
          ) : createRoomMutation.isPending ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                <p>Creating chat room...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="mb-2">Select a conversation to start chatting</p>
                {rooms?.length === 0 && (
                  <p className="text-sm text-gray-400">No conversations yet</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
