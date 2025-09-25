import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, Button, Stack, IconButton, Paper, Alert, CircularProgress } from "@mui/material";
import { Mic, MicOff, Videocam, VideocamOff, CallEnd, ScreenShare } from "@mui/icons-material";
import { useI18n } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";
import { 
  initPeer, 
  setupPeerListeners, 
  startLocalStream, 
  callPeer, 
  endCall, 
  toggleMicrophone, 
  toggleCamera, 
  startScreenShare, 
  stopScreenShare,
  restartCamera,
  getCurrentPeerId,
  getLocalStream,
  getRemoteStream,
  isPeerConnected,
  cleanup
} from "../services/peerjsService";
import { getCallData, updateCalleePeerId, endPeerJSCall, createPeerJSCall } from "../services/callService";

interface VideoCallProps {
  sessionId: string;
  currentUid: string;
  role: "deaf_mute" | "interpreter";
  onCallEnd?: () => void;
}

const VideoCall: React.FC<VideoCallProps> = ({ sessionId, currentUid, role, onCallEnd }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null);

  useEffect(() => {
    const initializeCall = async () => {
      try {
        setIsLoading(true);
        setError("");
        
        console.log('Starting PeerJS call for session:', sessionId);
        
        // Initialize PeerJS peer
        const myPeerId = await initPeer();
        setPeerId(myPeerId);
        console.log('My Peer ID:', myPeerId);

        // Start local media stream
        const localStream = await startLocalStream(true, true);
        console.log('Local stream obtained:', localStream);
        
        // Set up local video element with a small delay to ensure DOM is ready
        setTimeout(() => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
            console.log('Local video element connected to stream');
          } else {
            console.error('Local video ref is null');
          }
        }, 100);

        // Set up peer event listeners
        setupPeerListeners(
          // onRemoteStream
          (stream: MediaStream) => {
            console.log('Received remote stream');
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = stream;
            }
            setIsJoined(true);
          },
          // onDataReceived
          (data: any) => {
            console.log('Received data:', data);
          },
          // onConnectionClosed
          () => {
            console.log('Connection closed');
            setIsJoined(false);
          }
        );

        // Get call data from Firestore
        let callData = await getCallData(sessionId);
        
        // Determine caller vs callee based on role
        const isCaller = role === "deaf_mute";

        if (isCaller) {
          console.log('Calling as caller...');
          
          // If call document doesn't exist, create it
          if (!callData) {
            await createPeerJSCall(sessionId, currentUid, myPeerId);
            callData = await getCallData(sessionId);
          }
          
          // Caller should call the interpreter's peer ID
          if (callData?.calleePeerId) {
            setRemotePeerId(callData.calleePeerId);
            await callPeer(callData.calleePeerId);
            setIsJoined(true);
          } else {
            console.log('Waiting for interpreter to join...');
            // The call will be initiated when interpreter joins
          }
        } else {
          console.log('Waiting as callee...');
          
          // Callee should update their peer ID in Firestore
          await updateCalleePeerId(sessionId, currentUid, myPeerId);
          
          // Get updated call data
          callData = await getCallData(sessionId);
          setRemotePeerId(callData?.callerPeerId || 'unknown');
          // The call will be handled by the peer event listeners
        }

        console.log('PeerJS call initialized successfully');
        
      } catch (err: any) {
        console.error('Failed to initialize PeerJS call:', err);
        setError(err.message || 'Failed to join call');
      } finally {
        setIsLoading(false);
      }
    };

    initializeCall();

    return () => {
      console.log('Cleaning up PeerJS call...');
      cleanup();
    };
  }, [sessionId, currentUid, role]);

  // Additional effect to ensure local video is properly connected
  useEffect(() => {
    const updateLocalVideo = () => {
      const localStream = getLocalStream();
      if (localStream && localVideoRef.current && !localVideoRef.current.srcObject) {
        localVideoRef.current.srcObject = localStream;
        console.log('Local video element updated via useEffect');
      }
    };

    // Try immediately and also after a short delay
    updateLocalVideo();
    const timeoutId = setTimeout(updateLocalVideo, 500);

    return () => clearTimeout(timeoutId);
  }, [isLoading]); // Run when loading state changes

  const handleToggleMic = async () => {
    try {
      const enabled = await toggleMicrophone();
      setIsMuted(!enabled);
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  };

  const handleToggleVideo = async () => {
    try {
      const enabled = await toggleCamera();
      setIsVideoOn(enabled);
      
      // If camera was disabled and now enabled, restart it
      if (enabled && !isVideoOn) {
        console.log('Restarting camera...');
        await restartCamera();
        
        // Update local video element with new stream
        const localStream = getLocalStream();
        if (localStream && localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
          console.log('Local video element updated with new stream');
        }
      }
    } catch (error) {
      console.error('Failed to toggle camera:', error);
    }
  };

  const handleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('Failed to toggle screen sharing:', error);
    }
  };

  const handleEndCall = async () => {
    try {
      await endCall();
      await endPeerJSCall(sessionId);
      setIsJoined(false);
      
      // Call the onCallEnd callback if provided
      if (onCallEnd) {
        onCallEnd();
      }
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>Joining call...</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Role: {role} | Session: {sessionId}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {role === "deaf_mute" ? "Calling interpreter..." : "Waiting for call..."}
        </Typography>
        {peerId && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            My Peer ID: {peerId}
          </Typography>
        )}
        <Typography variant="body2" sx={{ mt: 2, color: 'primary.main' }}>
          📹 Please allow camera and microphone access when prompted
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#1a1a1a' }}>
      {/* Header */}
      <Box sx={{ p: 2, bgcolor: '#2d2d2d', color: 'white' }}>
        <Typography variant="h6">
          Video Call - Session: {sessionId}
        </Typography>
        <Typography variant="body2" color="grey.400">
          Status: {isPeerConnected() ? 'Connected' : 'Disconnected'} | Role: {role}
        </Typography>
        <Typography variant="body2" color="grey.400">
          My Peer ID: {peerId} | Remote Peer ID: {remotePeerId || 'Unknown'}
        </Typography>
      </Box>

      {/* Video Container */}
      <Box sx={{ flex: 1, display: 'flex', p: 2, gap: 2 }}>
        {/* Remote Video Container */}
        <Paper 
          sx={{ 
            flex: 1, 
            minHeight: 400, 
            bgcolor: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            position: 'relative'
          }}
        >
          <video 
            ref={remoteVideoRef}
            autoPlay 
            playsInline 
            style={{ width: '100%', height: '100%', minHeight: 400 }}
          />
          {!isJoined && (
            <Typography>Waiting for other participant...</Typography>
          )}
        </Paper>

        {/* Local Video */}
        <Paper 
          sx={{ 
            width: 300, 
            height: 200, 
            bgcolor: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}
        >
          <video 
            ref={localVideoRef}
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', height: '100%' }}
          />
        </Paper>
      </Box>

      {/* Controls */}
      <Box sx={{ p: 2, bgcolor: '#2d2d2d', display: 'flex', justifyContent: 'center' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton
            onClick={handleToggleMic}
            sx={{ 
              bgcolor: isMuted ? '#f44336' : '#4caf50',
              color: 'white',
              '&:hover': { bgcolor: isMuted ? '#d32f2f' : '#388e3c' }
            }}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </IconButton>

          <IconButton
            onClick={handleToggleVideo}
            sx={{ 
              bgcolor: isVideoOn ? '#4caf50' : '#f44336',
              color: 'white',
              '&:hover': { bgcolor: isVideoOn ? '#388e3c' : '#d32f2f' }
            }}
          >
            {isVideoOn ? <Videocam /> : <VideocamOff />}
          </IconButton>

          <IconButton
            onClick={handleScreenShare}
            sx={{ 
              bgcolor: isScreenSharing ? '#ff9800' : '#2196f3',
              color: 'white',
              '&:hover': { bgcolor: isScreenSharing ? '#f57c00' : '#1976d2' }
            }}
          >
            <ScreenShare />
          </IconButton>

          <IconButton
            onClick={handleEndCall}
            sx={{ 
              bgcolor: '#f44336',
              color: 'white',
              '&:hover': { bgcolor: '#d32f2f' }
            }}
          >
            <CallEnd />
          </IconButton>
        </Stack>
      </Box>

      {/* Status */}
      <Box sx={{ p: 1, bgcolor: '#1a1a1a', color: 'white', textAlign: 'center' }}>
        <Typography variant="body2">
          {isJoined ? "Connected" : "Connecting..."} | 
          Mic: {isMuted ? "Off" : "On"} | 
          Camera: {isVideoOn ? "On" : "Off"} |
          Screen: {isScreenSharing ? "Sharing" : "Off"}
        </Typography>
      </Box>
    </Box>
  );
};

export default VideoCall;