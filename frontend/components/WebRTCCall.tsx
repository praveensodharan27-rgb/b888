'use client';

import { useEffect, useRef, useState } from 'react';
import { FiVideo, FiVideoOff, FiPhone, FiPhoneOff, FiMic, FiMicOff, FiX } from 'react-icons/fi';
import { getSocket } from '@/lib/socket';

interface WebRTCCallProps {
  roomId: string;
  callerId: string;
  receiverId: string;
  isIncoming?: boolean;
  callerName?: string;
  isAudioOnly?: boolean;
  onEndCall: () => void;
}

export default function WebRTCCall({
  roomId,
  callerId,
  receiverId,
  isIncoming = false,
  callerName = 'User',
  isAudioOnly = false,
  onEndCall,
}: WebRTCCallProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(!isAudioOnly);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'active' | 'ended'>(
    isIncoming ? 'ringing' : 'connecting'
  );
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  // WebRTC configuration
  const rtcConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      setError('Socket connection not available');
      return;
    }

    socketRef.current = socket;

    // Set up socket event listeners
    const setupSocketListeners = () => {
      // Handle incoming call offer (only for incoming calls)
      socket.on('webrtc_offer', async (data: { offer: RTCSessionDescriptionInit; callerId: string; roomId: string }) => {
        if (data.roomId !== roomId || !isIncoming) return;

        try {
          // If call is not active yet, store the offer
          if (callStatus !== 'active' || !peerConnectionRef.current) {
            pendingOfferRef.current = data.offer;
            return;
          }

          // Process the offer
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);

          socket.emit('webrtc_answer', {
            roomId,
            answer,
            receiverId: callerId,
          });
        } catch (error) {
          console.error('Error handling offer:', error);
          setError('Failed to accept call');
        }
      });

      // Handle incoming answer
      socket.on('webrtc_answer', async (data: { answer: RTCSessionDescriptionInit; roomId: string }) => {
        if (data.roomId !== roomId) return;

        try {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            setCallStatus('active');
          }
        } catch (error) {
          console.error('Error handling answer:', error);
          setError('Failed to establish connection');
        }
      });

      // Handle ICE candidates
      socket.on('webrtc_ice_candidate', async (data: { candidate: RTCIceCandidateInit; roomId: string }) => {
        if (data.roomId !== roomId || !peerConnectionRef.current) return;

        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      });

      // Handle call rejection
      socket.on('webrtc_call_rejected', (data: { roomId: string }) => {
        if (data.roomId === roomId) {
          setCallStatus('ended');
          setError('Call rejected');
          setTimeout(() => {
            onEndCall();
          }, 2000);
        }
      });

      // Handle call ended
      socket.on('webrtc_call_ended', (data: { roomId: string }) => {
        if (data.roomId === roomId) {
          setCallStatus('ended');
          setTimeout(() => {
            onEndCall();
          }, 1000);
        }
      });
    };

    setupSocketListeners();

    // Initialize call
    const initializeCall = async () => {
      try {
        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoEnabled,
          audio: isAudioEnabled,
        });

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        await createPeerConnection();

        // If initiating call, create offer after a short delay to ensure everything is set up
        if (!isIncoming) {
          setTimeout(async () => {
            try {
              if (peerConnectionRef.current) {
                const offer = await peerConnectionRef.current.createOffer();
                await peerConnectionRef.current.setLocalDescription(offer);

                socket.emit('webrtc_offer', {
                  roomId,
                  offer,
                  receiverId,
                });

                setCallStatus('ringing');
              }
            } catch (error) {
              console.error('Error creating offer:', error);
              setError('Failed to create call offer');
            }
          }, 500);
        }
      } catch (error: any) {
        console.error('Error initializing call:', error);
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setError('Camera/microphone permission denied');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          setError('No camera/microphone found');
        } else {
          setError('Failed to start call');
        }
      }
    };

    initializeCall();

    // Cleanup
    return () => {
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
      socket.off('webrtc_call_rejected');
      socket.off('webrtc_call_ended');

      // Clean up media streams
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Clean up peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [roomId, callerId, receiverId, isIncoming, isVideoEnabled, isAudioEnabled, onEndCall]);

  const createPeerConnection = async () => {
    const pc = new RTCPeerConnection(rtcConfiguration);
    peerConnectionRef.current = pc;

    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc_ice_candidate', {
          roomId,
          candidate: event.candidate,
          receiverId,
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setError('Connection lost');
        setCallStatus('ended');
        setTimeout(() => {
          onEndCall();
        }, 2000);
      }
    };
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const handleEndCall = () => {
    setCallStatus('ended');

    if (socketRef.current) {
      socketRef.current.emit('webrtc_end_call', {
        roomId,
        receiverId,
      });
    }

    // Clean up
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    setTimeout(() => {
      onEndCall();
    }, 500);
  };

  const handleRejectCall = () => {
    if (socketRef.current) {
      socketRef.current.emit('webrtc_reject_call', {
        roomId,
        callerId,
      });
    }
    handleEndCall();
  };

  const handleAcceptCall = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      await createPeerConnection();

      setCallStatus('active');

      // Process pending offer if it arrived before acceptance
      if (pendingOfferRef.current && peerConnectionRef.current && socketRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);

          socketRef.current.emit('webrtc_answer', {
            roomId,
            answer,
            receiverId: callerId,
          });

          pendingOfferRef.current = null;
        } catch (error) {
          console.error('Error processing pending offer:', error);
          setError('Failed to process call offer');
        }
      }
    } catch (error: any) {
      console.error('Error accepting call:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Camera/microphone permission denied');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setError('No camera/microphone found');
      } else {
        setError('Failed to accept call');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="relative w-full h-full flex flex-col">
        {/* Remote Video */}
        <div className="flex-1 relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            muted={false}
          />
          {callStatus === 'ringing' && isIncoming && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-center text-white">
                <div className="text-4xl font-bold mb-4">{callerName}</div>
                <div className="text-xl mb-8">Incoming call...</div>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleRejectCall}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleAcceptCall}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-full p-4 transition-colors"
                  >
                    <FiPhone className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          )}
          {callStatus === 'connecting' && !isIncoming && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-center text-white">
                <div className="text-xl mb-4">Connecting...</div>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              </div>
            </div>
          )}
        </div>

        {/* Local Video */}
        <div className="absolute top-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <FiVideoOff className="w-8 h-8 text-white" />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
          <button
            onClick={toggleVideo}
            className={`rounded-full p-4 transition-colors ${
              isVideoEnabled
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
          >
            {isVideoEnabled ? <FiVideo className="w-6 h-6" /> : <FiVideoOff className="w-6 h-6" />}
          </button>
          <button
            onClick={toggleAudio}
            className={`rounded-full p-4 transition-colors ${
              isAudioEnabled
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? <FiMic className="w-6 h-6" /> : <FiMicOff className="w-6 h-6" />}
          </button>
          <button
            onClick={handleEndCall}
            className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 transition-colors"
            title="End call"
          >
            <FiPhoneOff className="w-6 h-6" />
          </button>
        </div>

        {/* Call Status */}
        {callStatus === 'active' && (
          <div className="absolute top-4 left-4 text-white">
            <div className="text-sm opacity-75">Call in progress</div>
          </div>
        )}
      </div>
    </div>
  );
}
