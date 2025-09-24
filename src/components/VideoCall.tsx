import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, Button, Stack, IconButton, Paper, Alert, CircularProgress } from "@mui/material";
import { Mic, MicOff, Videocam, VideocamOff, CallEnd, ScreenShare } from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { WebRTCService } from "../services/webrtcService";

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
  const [webrtc, setWebrtc] = useState<WebRTCService | null>(null);

  useEffect(() => {
    const initializeCall = async () => {
      try {
        setIsLoading(true);
        setError("");
        
        console.log('Starting WebRTC call for session:', sessionId);
        
        // Create WebRTC service instance
        const svc = new WebRTCService();
        setWebrtc(svc);

        // Start local media stream
        const { localStream, remoteStream } = await svc.startLocalStream(true, true);
        
        // Set up video elements
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }

        // Create peer connection
        svc.createPeerConnection((remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });

        // Determine caller vs callee based on role
        // Deaf/mute user creates the offer (caller)
        const isCaller = role === "deaf_mute";

        if (isCaller) {
          console.log('Creating call as caller...');
          await svc.createCall(sessionId, currentUid);
        } else {
          console.log('Answering call as callee...');
          await svc.answerCall(sessionId, currentUid);
        }

        setIsJoined(true);
        console.log('WebRTC call initialized successfully');
        
      } catch (err: any) {
        console.error('Failed to initialize WebRTC call:', err);
        setError(err.message || 'Failed to join call');
      } finally {
        setIsLoading(false);
      }
    };

    initializeCall();

    return () => {
      console.log('Cleaning up WebRTC call...');
      if (webrtc) {
        webrtc.hangUp(sessionId, true).catch(console.error);
      }
    };
  }, [sessionId, currentUid, role]);

  const handleToggleMic = async () => {
    try {
      if (webrtc) {
        const enabled = await webrtc.toggleMicrophone();
        setIsMuted(!enabled);
      }
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  };

  const handleToggleVideo = async () => {
    try {
      if (webrtc) {
        const enabled = await webrtc.toggleCamera();
        setIsVideoOn(enabled);
      }
    } catch (error) {
      console.error('Failed to toggle camera:', error);
    }
  };

  const handleScreenShare = async () => {
    try {
      if (webrtc) {
        if (isScreenSharing) {
          await webrtc.stopScreenShare();
          setIsScreenSharing(false);
        } else {
          await webrtc.startScreenShare();
          setIsScreenSharing(true);
        }
      }
    } catch (error) {
      console.error('Failed to toggle screen sharing:', error);
    }
  };

  const handleEndCall = async () => {
    try {
      if (webrtc) {
        await webrtc.hangUp(sessionId, true);
        setIsJoined(false);
        
        // Call the onCallEnd callback if provided
        if (onCallEnd) {
          onCallEnd();
        }
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
          {role === "deaf_mute" ? "Creating offer..." : "Waiting for offer..."}
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
          Status: {webrtc?.isConnected() ? 'Connected' : 'Disconnected'} | Role: {role}
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
