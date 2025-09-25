import Peer from 'peerjs';

// Global variables for peer and connections
let peer: Peer | null = null;
let currentPeerId: string | null = null;
let dataConnection: any | null = null;
let mediaConnection: any | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let isConnected = false;

// Initialize PeerJS peer
export const initPeer = async (peerId?: string): Promise<string> => {
  try {
    console.log('Initializing PeerJS peer...');
    
    if (peer && peer.id) {
      console.log('Peer already initialized with ID:', peer.id);
      return peer.id;
    }
    
    // Create new peer instance with default configuration (no custom server)
    peer = peerId ? new Peer(peerId) : new Peer();
    
    return new Promise((resolve, reject) => {
      peer!.on('open', (id: string) => {
        console.log('PeerJS peer initialized with ID:', id);
        currentPeerId = id;
        resolve(id);
      });
      
      peer!.on('error', (error: Error) => {
        console.error('PeerJS initialization error:', error);
        // Try to provide a more helpful error message
        if (error.message.includes('CORS') || error.message.includes('fetch')) {
          reject(new Error('Unable to connect to PeerJS server. Please check your internet connection and try again.'));
        } else {
          reject(error);
        }
      });
    });
    
  } catch (error) {
    console.error('Failed to initialize PeerJS peer:', error);
    throw error;
  }
};

// Set up event listeners for incoming connections
export const setupPeerListeners = (
  onRemoteStream: (stream: MediaStream) => void,
  onDataReceived: (data: any) => void,
  onConnectionClosed: () => void
): void => {
  if (!peer) {
    throw new Error('Peer not initialized');
  }
  
  // Handle incoming data connections
  peer.on('connection', (conn: any) => {
    console.log('Incoming data connection from:', conn.peer);
    dataConnection = conn;
    
    conn.on('data', (data: any) => {
      console.log('Received data:', data);
      onDataReceived(data);
    });
    
    conn.on('close', () => {
      console.log('Data connection closed');
      onConnectionClosed();
    });
    
    conn.on('error', (error: Error) => {
      console.error('Data connection error:', error);
    });
  });
  
  // Handle incoming media connections (calls)
  peer.on('call', async (call: any) => {
    console.log('Incoming call from:', call.peer);
    
    try {
      // Answer the call with local stream
      if (localStream) {
        call.answer(localStream);
        mediaConnection = call;
        
        // Handle remote stream
        call.on('stream', (stream: MediaStream) => {
          console.log('Received remote stream');
          remoteStream = stream;
          onRemoteStream(stream);
        });
        
        call.on('close', () => {
          console.log('Call ended');
          onConnectionClosed();
        });
        
        call.on('error', (error: Error) => {
          console.error('Call error:', error);
        });
        
        isConnected = true;
      } else {
        throw new Error('No local stream available to answer call');
      }
    } catch (error) {
      console.error('Failed to answer call:', error);
    }
  });
};

// Start local media stream
export const startLocalStream = async (audio: boolean = true, video: boolean = true): Promise<MediaStream> => {
  try {
    console.log('Requesting camera and microphone access...');
    
    const constraints = {
      audio: audio,
      video: video ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      } : false
    };
    
    console.log('Media constraints:', constraints);
    
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('✅ Camera and microphone access granted');
    console.log('Local stream tracks:', localStream.getTracks().map(track => ({
      kind: track.kind,
      enabled: track.enabled,
      readyState: track.readyState
    })));
    
    return localStream;
  } catch (error) {
    console.error('❌ Failed to access camera/microphone:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Camera and microphone access denied. Please allow access and refresh the page.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No camera or microphone found. Please connect a camera and microphone.');
      } else if (error.name === 'NotReadableError') {
        throw new Error('Camera or microphone is already in use by another application.');
      }
    }
    
    throw new Error('Failed to access camera and microphone. Please check your device permissions.');
  }
};

// Call another peer
export const callPeer = async (remotePeerId: string, onRemoteStream?: (stream: MediaStream) => void): Promise<void> => {
  try {
    if (!peer) {
      throw new Error('Peer not initialized');
    }
    
    if (!localStream) {
      throw new Error('Local stream not available');
    }
    
    console.log('Calling peer:', remotePeerId);
    
    // Create media connection
    const call = peer.call(remotePeerId, localStream);
    mediaConnection = call;
    
    // Handle remote stream
    call.on('stream', (stream: MediaStream) => {
      console.log('Received remote stream');
      remoteStream = stream;
      if (onRemoteStream) {
        onRemoteStream(stream);
      }
    });
    
    call.on('close', () => {
      console.log('Call ended');
      isConnected = false;
    });
    
    call.on('error', (error: Error) => {
      console.error('Call error:', error);
    });
    
    // Create data connection for signaling
    const conn = peer.connect(remotePeerId);
    dataConnection = conn;
    
    conn.on('open', () => {
      console.log('Data connection established');
      isConnected = true;
    });
    
    conn.on('data', (data: any) => {
      console.log('Received data:', data);
    });
    
    conn.on('close', () => {
      console.log('Data connection closed');
    });
    
    conn.on('error', (error: Error) => {
      console.error('Data connection error:', error);
    });
    
  } catch (error) {
    console.error('Failed to call peer:', error);
    throw error;
  }
};

// End call
export const endCall = async (): Promise<void> => {
  try {
    console.log('Ending call...');
    
    // Close media connection
    if (mediaConnection) {
      mediaConnection.close();
      mediaConnection = null;
    }
    
    // Close data connection
    if (dataConnection) {
      dataConnection.close();
      dataConnection = null;
    }
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      localStream = null;
    }
    
    // Close peer connection
    if (peer) {
      peer.destroy();
      peer = null;
    }
    
    // Reset variables
    currentPeerId = null;
    remoteStream = null;
    isConnected = false;
    
    console.log('Call ended successfully');
    
  } catch (error) {
    console.error('Failed to end call:', error);
    throw error;
  }
};

// Restart camera (create new video track)
export const restartCamera = async (): Promise<void> => {
  try {
    if (!localStream) {
      throw new Error('Local stream not available');
    }
    
    console.log('Restarting camera...');
    
    // Create new video track
    const newVideoTrack = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      }
    });
    
    // Replace the video track in local stream
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      localStream.removeTrack(videoTrack);
    }
    
    const newVideoTrackStream = newVideoTrack.getVideoTracks()[0];
    localStream.addTrack(newVideoTrackStream);
    
    // Replace track in media connection if active
    if (mediaConnection) {
      const sender = mediaConnection.peerConnection.getSenders().find((s: any) => 
        s.track && s.track.kind === 'video'
      );
      if (sender) {
        await sender.replaceTrack(newVideoTrackStream);
      }
    }
    
    console.log('Camera restarted successfully');
    
  } catch (error) {
    console.error('Failed to restart camera:', error);
    throw error;
  }
};

// Toggle microphone
export const toggleMicrophone = async (): Promise<boolean> => {
  try {
    if (!localStream) {
      throw new Error('Local stream not available');
    }
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      const enabled = !audioTrack.enabled;
      audioTrack.enabled = enabled;
      console.log('Microphone toggled:', enabled ? 'ON' : 'OFF');
      return enabled;
    }
    return false;
  } catch (error) {
    console.error('Failed to toggle microphone:', error);
    return false;
  }
};

// Toggle camera
export const toggleCamera = async (): Promise<boolean> => {
  try {
    if (!localStream) {
      throw new Error('Local stream not available');
    }
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      const enabled = !videoTrack.enabled;
      videoTrack.enabled = enabled;
      
      // If disabling camera, stop the track to turn off camera light
      if (!enabled) {
        videoTrack.stop();
        console.log('Camera track stopped - camera light should turn off');
        
        // Create a new video track when re-enabling
        // We'll handle this in the VideoCall component
      } else {
        console.log('Camera enabled');
      }
      
      console.log('Camera toggled:', enabled ? 'ON' : 'OFF');
      return enabled;
    }
    return false;
  } catch (error) {
    console.error('Failed to toggle camera:', error);
    return false;
  }
};

// Start screen sharing
export const startScreenShare = async (): Promise<void> => {
  try {
    if (!localStream) {
      throw new Error('Local stream not available');
    }
    
    console.log('Starting screen sharing...');
    
    // Get screen stream
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: true
    });
    
    // Replace video track in local stream
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      localStream.removeTrack(videoTrack);
      videoTrack.stop();
    }
    
    const screenVideoTrack = screenStream.getVideoTracks()[0];
    localStream.addTrack(screenVideoTrack);
    
    // Replace track in media connection if active
    if (mediaConnection) {
      const sender = mediaConnection.peerConnection.getSenders().find((s: { track: { kind: string; }; }) => 
        s.track && s.track.kind === 'video'
      );
      if (sender) {
        await sender.replaceTrack(screenVideoTrack);
      }
    }
    
    console.log('Screen sharing started');
    
  } catch (error) {
    console.error('Failed to start screen sharing:', error);
    throw error;
  }
};

// Stop screen sharing
export const stopScreenShare = async (): Promise<void> => {
  try {
    if (!localStream) {
      throw new Error('Local stream not available');
    }
    
    console.log('Stopping screen sharing...');
    
    // Get camera stream
    const cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      }
    });
    
    // Replace video track in local stream
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      localStream.removeTrack(videoTrack);
      videoTrack.stop();
    }
    
    const cameraVideoTrack = cameraStream.getVideoTracks()[0];
    localStream.addTrack(cameraVideoTrack);
    
    // Replace track in media connection if active
    if (mediaConnection) {
      const sender = mediaConnection.peerConnection.getSenders().find((s: { track: { kind: string; }; }) => 
        s.track && s.track.kind === 'video'
      );
      if (sender) {
        await sender.replaceTrack(cameraVideoTrack);
      }
    }
    
    console.log('Screen sharing stopped');
    
  } catch (error) {
    console.error('Failed to stop screen sharing:', error);
    throw error;
  }
};

// Send data to remote peer
export const sendData = (data: any): void => {
  if (dataConnection && dataConnection.open) {
    dataConnection.send(data);
    console.log('Sent data:', data);
  } else {
    console.warn('Data connection not available');
  }
};

// Get current peer ID
export const getCurrentPeerId = (): string | null => {
  return currentPeerId;
};

// Get local stream
export const getLocalStream = (): MediaStream | null => {
  return localStream;
};

// Get remote stream
export const getRemoteStream = (): MediaStream | null => {
  return remoteStream;
};

// Check if connected
export const isPeerConnected = (): boolean => {
  return isConnected;
};

// Check if peer is initialized
export const isPeerInitialized = (): boolean => {
  return peer !== null && currentPeerId !== null;
};

// Clean up resources
export const cleanup = (): void => {
  if (peer) {
    peer.destroy();
    peer = null;
  }
  
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  dataConnection = null;
  mediaConnection = null;
  currentPeerId = null;
  remoteStream = null;
  isConnected = false;
  
  console.log('PeerJS resources cleaned up');
};
