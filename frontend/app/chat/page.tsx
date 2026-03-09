'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { FiSend, FiArrowLeft, FiPhone, FiVideo, FiFlag, FiPlus, FiImage, FiSmile, FiShield, FiMessageCircle } from 'react-icons/fi';
import ImageWithFallback from '@/components/ImageWithFallback';
import Link from 'next/link';
import { getAdUrl } from '@/lib/directory';
import WebRTCCall from '@/components/WebRTCCall';
import { CONTENT_CONTAINER_CLASS } from '@/lib/layoutConstants';

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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
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
  const [conversationFilter, setConversationFilter] = useState<'all' | 'buying' | 'selling'>('all');

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

  const { data: rooms = [], error: roomsError, refetch: refetchRooms } = useQuery({
    queryKey: ['chat', 'rooms'],
    queryFn: async () => {
      // Temporarily return empty list if chat backend is not fully configured
      if (!isAuthenticated) return [];
      return [];
    },
    enabled: isAuthenticated,
    retry: 0,
  });

  const timeAgo = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isToday(d)) return formatDistanceToNow(d, { addSuffix: true });
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  };

  const formatMessageTime = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'h:mm a');
  };

  const formatDateSeparator = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'EEEE, MMM d');
  };

  const isSameDay = (a: string | undefined, b: string | undefined) => {
    if (!a || !b) return false;
    const d1 = new Date(a);
    const d2 = new Date(b);
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };

  const suggestReplyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoom) throw new Error('No room selected');
      const { data } = await api.post<{ success: boolean; reply?: string; message?: string }>('/ai/sales-reply', { roomId: selectedRoom });
      if (!data.success || !data.reply) throw new Error(data.message || 'Could not get suggestion');
      return data.reply;
    },
    onSuccess: (reply) => {
      setMessage(reply);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'AI suggest failed';
      alert(msg);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!rooms?.length) return;
      await Promise.all(
        (rooms as any[]).map((room: any) =>
          api.post(`/chat/rooms/${room.id}/read-all`).catch(() => {})
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'unread-count'] });
    },
  });

  const filteredRooms = (rooms ?? []).filter((room: any) => {
    if (conversationFilter === 'all') return true;
    const amSeller = room.ad?.userId === user?.id;
    if (conversationFilter === 'selling') return amSeller;
    if (conversationFilter === 'buying') return !amSeller;
    return true;
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

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['chat', 'messages', selectedRoom],
    queryFn: async () => {
      const response = await api.get(`/chat/rooms/${selectedRoom}/messages`);
      queryClient.invalidateQueries({ queryKey: ['chat', 'unread-count'] });
      // Backend already returns oldest-first (desc then .reverse()); keep that order so latest is at bottom
      const list = response.data.messages || [];
      return [...list];
    },
    enabled: !!selectedRoom,
    refetchOnWindowFocus: true,
    refetchInterval: selectedRoom ? 5000 : false,
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    const applySocket = () => {
      const sock = getSocket();
      setSocket((prev: any) => (prev !== sock ? sock : prev));
      return sock;
    };
    applySocket();
    const interval = setInterval(applySocket, 2000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    const sock = socket;
    if (sock) {
        // Handle new messages
        sock.on('new_message', (newMessage: any) => {
          const isCurrentUser = newMessage.senderId === user?.id;
          const isCurrentRoom = newMessage.roomId === selectedRoom;
          
          queryClient.setQueryData(['chat', 'messages', newMessage.roomId], (old: any) => {
            if (!old) return [newMessage];
            if (old.some((msg: any) => msg.id === newMessage.id)) return old;
            // Replace optimistic message (temp id) with real one to avoid duplicate
            const withoutOpt = old.filter((msg: any) => !String(msg.id).startsWith('temp-'));
            return [...withoutOpt, newMessage];
          });
          // Update room list only when message is from other user (skip for our own send to avoid flicker)
          if (!isCurrentUser) {
            queryClient.setQueryData(['chat', 'rooms'], (oldRooms: any[]) => {
              if (!oldRooms) return oldRooms;
              const updated = oldRooms.map((room: any) =>
                room.id === newMessage.roomId
                  ? {
                      ...room,
                      updatedAt: new Date().toISOString(),
                      messages: [{ ...newMessage, sender: newMessage.sender || { id: newMessage.senderId, name: '' } }],
                    }
                  : room
              );
              return updated.sort((a: any, b: any) =>
                new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
              );
            });
          }
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
          
          // Scroll behavior for new messages is handled centrally in the
          // [messages, selectedRoom] effect to avoid double-scrolling/flicker.
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

        // Handle connection events – refetch messages so any received while disconnected appear
        sock.on('connect', () => {
          if (selectedRoom) refetchMessages();
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
          const roomsData = queryClient.getQueryData<any[]>(['chat', 'rooms']);
          const currentRoom = roomsData?.find((room: any) => room.id === data.roomId);
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
  }, [socket, queryClient, selectedRoom, user?.id, refetchMessages]);

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

  // Scroll messages container to bottom when room or messages change (WhatsApp-style: latest at bottom)
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    let cancelled = false;
    const scrollToBottom = () => {
      if (!cancelled) el.scrollTop = el.scrollHeight;
    };
    const t = setTimeout(scrollToBottom, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [messages, selectedRoom]);

  // When user selects a chat, scroll the chat panel into view (mobile / small screens)
  useEffect(() => {
    if (selectedRoom && chatPanelRef.current) {
      const t = setTimeout(() => {
        chatPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [selectedRoom]);

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

  const sendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || message.trim();
    if (!messageToSend || !selectedRoom || !user) return;

    // Stop typing indicator
    if (socket) {
      if (isTyping) {
        setIsTyping(false);
        socket.emit('stop_typing', { roomId: selectedRoom });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    // Optimistic update: show message immediately to avoid flicker
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      content: messageToSend,
      type: 'TEXT',
      senderId: user.id,
      receiverId: '',
      roomId: selectedRoom,
      createdAt: new Date().toISOString(),
      sender: { id: user.id, name: user.name || '', avatar: user.avatar || null },
    };
    queryClient.setQueryData(['chat', 'messages', selectedRoom], (old: any) => (old ? [...old, optimisticMessage] : [optimisticMessage]));

    // Always send via REST so chat works even when socket is disconnected
    try {
      const { data } = await api.post<{ success: boolean; message: any }>(`/chat/rooms/${selectedRoom}/messages`, {
        content: messageToSend,
        type: 'TEXT',
      });
      if (data.success && data.message) {
        queryClient.setQueryData(['chat', 'messages', selectedRoom], (old: any) => {
          if (!old) return [data.message];
          const withoutTemp = old.filter((msg: any) => !String(msg.id).startsWith('temp-'));
          const withoutDup = withoutTemp.filter((m: any) => String(m.id) !== String(data.message.id));
          return [...withoutDup, data.message];
        });
        queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] });
        queryClient.invalidateQueries({ queryKey: ['chat', 'unread-count'] });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to send message';
      queryClient.setQueryData(['chat', 'messages', selectedRoom], (old: any) =>
        old ? old.filter((m: any) => m.id !== tempId) : old
      );
      alert(msg);
    }

    setMessage('');
    setTimeout(() => {
      const el = messagesContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  };

  if (!isAuthenticated) {
    return (
      <div className="w-full px-4 py-8 text-center">
        <p className="text-gray-600">Please login to access chat</p>
      </div>
    );
  }

  const currentRoom = rooms?.find((room: any) => String(room?.id) === String(selectedRoom));
  const otherUser = currentRoom?.user1 && currentRoom?.user2
    ? (currentRoom.user1.id === user?.id ? currentRoom.user2 : currentRoom.user1)
    : null;
  const isSeller = Boolean(currentRoom?.ad && (currentRoom.ad as { userId?: string })?.userId === user?.id);

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
      <div className="h-[calc(100vh-var(--navbar-height))] bg-gray-50 flex items-center">
        <div className={`${CONTENT_CONTAINER_CLASS} w-full`}>
      <div className="flex min-w-0 h-[calc(100vh-var(--navbar-height)-2rem)] min-h-[420px] overflow-hidden bg-white rounded-xl shadow border border-gray-200">
        {/* Sidebar: fixed width on desktop, does not shrink */}
        <div className="w-full sm:w-[380px] flex-shrink-0 flex flex-col min-h-0 border-r border-gray-200 bg-gray-50/30">
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Chats</h2>
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Archive All
              </button>
            </div>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              {[
                { id: 'all', label: 'All Messages' },
                { id: 'buying', label: 'Buying' },
                { id: 'selling', label: 'Selling' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setConversationFilter(id as 'all' | 'buying' | 'selling')}
                  className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                    conversationFilter === id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
            {roomsError && (
              <div className="p-4 text-center">
                <p className="text-sm text-red-600 mb-2">Could not load conversations. Check your connection.</p>
                <button type="button" onClick={() => refetchRooms()} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Retry
                </button>
              </div>
            )}
            {!roomsError && filteredRooms.map((room: any) => {
              if (!room?.id) return null;
              const other = room.user1?.id === user?.id ? room.user2 : room.user1;
              if (!other) return null;
              const lastMessage = room.messages?.[0];
              const unreadCount = room._count?.messages ?? 0;
              const isSelected = String(selectedRoom) === String(room.id);
              const preview = lastMessage?.content ?? (room.ad ? room.ad.title : '');
              const lastTime = lastMessage?.createdAt ?? room.updatedAt;

              return (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={`relative flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 transition-colors ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50 bg-white'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r" />
                  )}
                  <div className="relative flex-shrink-0">
                    {other.avatar ? (
                      <ImageWithFallback src={other.avatar} alt={other.name} width={48} height={48} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                        {(other?.name?.[0] ?? '?').toUpperCase()}
                      </div>
                    )}
                    {onlineUsers.has(other.id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{other?.name ?? 'User'}</p>
                      {isSelected && onlineUsers.has(other.id) && (
                        <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">ONLINE NOW</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-0.5">{preview || 'No messages yet'}</p>
                    {room.ad && <p className="text-xs text-gray-400 truncate mt-0.5">{room.ad.title}</p>}
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(lastTime)}</span>
                    {unreadCount > 0 && <span className="mt-1 w-2 h-2 bg-blue-500 rounded-full" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Message panel: fills remaining space, min-w-0 prevents flex overflow */}
        <div ref={chatPanelRef} className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-white">
          {selectedRoom && currentRoom ? (
            <>
              {/* Chat header: name, ONLINE NOW, flag, Mark as Sold */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-3">
                  {otherUser && (
                    <>
                      <div className="relative flex-shrink-0">
                        {otherUser.avatar ? (
                          <ImageWithFallback src={otherUser.avatar} alt={otherUser.name} width={44} height={44} className="rounded-full object-cover" />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                            {(otherUser?.name?.[0] ?? '?').toUpperCase()}
                          </div>
                        )}
                        {onlineUsers.has(otherUser.id) && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{otherUser.name}</p>
                        <p className="text-xs text-green-600 font-medium">
                          {onlineUsers.has(otherUser.id) ? 'ONLINE NOW' : 'Offline'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Report">
                    <FiFlag className="w-5 h-5" />
                  </button>
                  {currentRoom?.ad?.userId === user?.id && (
                    <Link
                      href={currentRoom?.ad?.id ? `/edit-ad/${currentRoom.ad.id}` : '#'}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      Mark as Sold
                    </Link>
                  )}
                  {socket && otherUser && (
                    <div className="flex gap-1">
                      <button onClick={() => { if (selectedRoom && otherUser) { socket.emit('webrtc_initiate_call', { roomId: selectedRoom, receiverId: otherUser.id, isAudioOnly: false }); setActiveCall({ roomId: selectedRoom, callerId: user?.id || '', receiverId: otherUser.id, isIncoming: false, callerName: user?.name || 'You', isAudioOnly: false }); } }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Video call" disabled={!onlineUsers.has(otherUser.id)}>
                        <FiVideo className="w-5 h-5" />
                      </button>
                      <button onClick={() => { if (selectedRoom && otherUser) { socket.emit('webrtc_initiate_call', { roomId: selectedRoom, receiverId: otherUser.id, isAudioOnly: true }); setActiveCall({ roomId: selectedRoom, callerId: user?.id || '', receiverId: otherUser.id, isIncoming: false, callerName: user?.name || 'You', isAudioOnly: true }); } }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Audio call" disabled={!onlineUsers.has(otherUser.id)}>
                        <FiPhone className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Listed item card */}
              {currentRoom?.ad && (
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Listed Item</p>
                  <div className="flex gap-3 items-center">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                      {currentRoom.ad.images?.[0] ? (
                        <ImageWithFallback src={currentRoom.ad.images[0]} alt={currentRoom.ad.title} width={80} height={80} className="w-full h-full object-cover opacity-90" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 opacity-80" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{currentRoom.ad.title}</p>
                      <p className="text-blue-600 font-bold mt-0.5">
                        {currentRoom.ad.price != null ? `₹${Number(currentRoom.ad.price).toLocaleString('en-IN')}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link href={currentRoom.ad.id ? getAdUrl(currentRoom.ad) : '#'} className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                        View Listing
                      </Link>
                      <button type="button" className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Make Offer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide px-4 py-4">
                {messages?.length ? (
                  <>
                    {(() => {
                      const uniqueMessages = (messages as any[])
                        .filter((msg, i, arr) => arr.findIndex((m) => String(m.id) === String(msg.id)) === i)
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                      return uniqueMessages.map((msg: any, idx: number, arr: any[]) => {
                        const prevMsg = idx > 0 ? arr[idx - 1] : null;
                        const showDateSeparator = !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);
                        return (
                          <div key={String(msg.id)}>
                            {showDateSeparator && (
                              <div className="flex justify-center my-3">
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                  {formatDateSeparator(msg.createdAt)}
                                </span>
                              </div>
                            )}
                      <div
                        className={`flex gap-2 mb-4 ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.senderId !== user?.id && (
                          <div className="flex-shrink-0">
                            {msg.isAI || (msg as any).senderType === 'bot' ? (
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600" title="AI assistant">
                                <FiMessageCircle className="w-4 h-4" aria-hidden />
                              </div>
                            ) : otherUser?.avatar ? (
                              <ImageWithFallback
                                src={otherUser.avatar}
                                alt={`${otherUser?.name || 'User'} avatar`}
                                width={32}
                                height={32}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-semibold">
                                {(otherUser?.name?.[0] ?? '?').toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                            msg.senderId === user?.id
                              ? 'bg-blue-600 text-white rounded-br-md'
                              : 'bg-gray-200 text-gray-800 rounded-bl-md'
                          }`}
                        >
                          {msg.type === 'IMAGE' && msg.imageUrl && (
                            <div className="mb-2">
                              <img
                                src={msg.imageUrl}
                                alt="Shared"
                                className="max-w-full h-auto rounded-lg"
                              />
                            </div>
                          )}
                          <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                          <div className={`flex items-center gap-1 mt-1 ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-xs opacity-75">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                            {msg.senderId === user?.id && (
                              <span className="opacity-75" title="Read">
                                {otherUser?.avatar && !(msg.isAI || (msg as any).senderType === 'bot') ? (
                                  <ImageWithFallback
                                    src={otherUser.avatar}
                                    alt={`${otherUser?.name || 'User'} avatar`}
                                    width={14}
                                    height={14}
                                    className="rounded-full inline-block"
                                  />
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-full bg-gray-400 inline-block" />
                            )}
                          </span>
                            )}
                          </div>
                        </div>
                      </div>
                          </div>
                        );
                      });
                    })()}
                  </>
                ) : null}
                {/* Typing indicator - show when other user is typing */}
                {typingUsers.size > 0 && (
                  <div className="flex justify-start gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                      {otherUser?.avatar ? (
                        <ImageWithFallback src={otherUser.avatar} alt={`${otherUser?.name || 'User'} avatar`} width={32} height={32} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-semibold">
                          {(otherUser?.name?.[0] ?? '?').toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-200 text-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-md">
                      <span className="text-sm text-gray-600">
                        {otherUser?.name ? `${otherUser.name} is typing` : 'Typing'}
                      </span>
                      <span className="inline-flex gap-1 ml-1.5">
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick questions */}
              {currentRoom?.ad && (
                <div className="px-4 py-2 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2">
                    {['Is this available?', "What's the best price?", 'Where can I see it?'].map((q) => (
                      <button key={q} type="button" onClick={() => sendMessage(q)} className="px-3 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message input: plus, image, input, emoji, circular send */}
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <button type="button" className="p-2 text-gray-500 hover:text-gray-700 rounded-lg" title="Attach">
                    <FiPlus className="w-5 h-5" />
                  </button>
                  <button type="button" className="p-2 text-gray-500 hover:text-gray-700 rounded-lg" title="Image">
                    <FiImage className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
                    onInput={() => handleTyping()}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Write your message here..."
                    className="flex-1 min-w-0 bg-transparent border-0 outline-none text-gray-900 placeholder-gray-500 text-sm py-1"
                  />
                  <button type="button" className="p-2 text-gray-500 hover:text-gray-700 rounded-lg" title="Emoji">
                    <FiSmile className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => sendMessage()}
                    className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"
                    title="Send"
                  >
                    <FiSend className="w-5 h-5" />
                  </button>
                </div>
                {isSeller && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => suggestReplyMutation.mutate()}
                      disabled={suggestReplyMutation.isPending || !selectedRoom}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      {suggestReplyMutation.isPending ? '…' : 'Suggest reply (AI)'}
                    </button>
                  </div>
                )}
                <p className="flex items-center gap-2 mt-2 text-[10px] text-gray-500 uppercase tracking-wide">
                  <FiShield className="w-3.5 h-3.5 flex-shrink-0" />
                  Secure transaction protocol active
                </p>
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
      </div>
    </>
  );
}
