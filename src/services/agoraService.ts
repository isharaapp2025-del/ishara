import AgoraRTC, { 
  type IAgoraRTCClient, 
  type ICameraVideoTrack, 
  type IMicrophoneAudioTrack,
  type IAgoraRTCRemoteUser,
  type ConnectionState,
  type ConnectionDisconnectedReason
} from "agora-rtc-sdk-ng";

// Agora Configuration - Using Temporary Tokens
export const AGORA_CONFIG = {
  appId: '73a6fdb660614eb4bd38e452f2f0255a', // Your App ID
};

// Global variables for client and tracks
let client: IAgoraRTCClient | null = null;
let localTracks: (ICameraVideoTrack | IMicrophoneAudioTrack)[] = [];
let isJoined = false;

// Initialize Agora client
export const initAgora = async (): Promise<IAgoraRTCClient> => {
  try {
    console.log('Initializing Agora client...');
    
    if (client) {
      console.log('Client already initialized');
      return client;
    }
    
    client = AgoraRTC.createClient({ 
      mode: "rtc", 
      codec: "vp8" 
    });
    
    // Set up event listeners
    setupEventListeners(client);
    
    console.log('Agora client initialized successfully');
    return client;
  } catch (error) {
    console.error('Failed to initialize Agora client:', error);
    throw error;
  }
};

// Set up event listeners for the client
const setupEventListeners = (client: IAgoraRTCClient) => {
  // Handle user published (joined and started streaming)
  client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
    try {
      console.log('User published:', user.uid, mediaType);
      await client!.subscribe(user, mediaType);
      
      // Play remote audio
      if (mediaType === 'audio' && user.audioTrack) {
        user.audioTrack.play();
      }
      
      // Handle remote video
      if (mediaType === 'video' && user.videoTrack) {
        const remoteVideoContainer = document.getElementById(`remote-video-${user.uid}`);
        if (remoteVideoContainer) {
          user.videoTrack.play(remoteVideoContainer);
        }
      }
    } catch (error) {
      console.error('Failed to subscribe to user:', error);
    }
  });

  // Handle user unpublished (stopped streaming)
  client.on('user-unpublished', (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
    console.log('User unpublished:', user.uid, mediaType);
  });

  // Handle user left channel
  client.on('user-left', (user: IAgoraRTCRemoteUser) => {
    console.log('User left:', user.uid);
    const remoteVideoContainer = document.getElementById(`remote-video-${user.uid}`);
    if (remoteVideoContainer) {
      remoteVideoContainer.innerHTML = '';
    }
  });

  // Handle connection state changes
  client.on('connection-state-change', (curState: ConnectionState, revState: ConnectionState, reason?: ConnectionDisconnectedReason) => {
    console.log('Connection state changed:', curState, revState, reason);
  });
};

// Join call with temporary token (simplified approach)
export const joinCall = async (appId: string, channel: string, token: string): Promise<{
  client: IAgoraRTCClient;
  localTracks: (ICameraVideoTrack | IMicrophoneAudioTrack)[];
}> => {
  try {
    console.log('🚀 Starting Agora call with temporary token...');
    console.log('App ID:', appId);
    console.log('Channel:', channel);
    console.log('Token:', token ? 'Provided' : 'None');
    
    // Initialize client if not already done
    if (!client) {
      await initAgora();
    }
    
    // Join channel
    console.log('🔄 Attempting to join channel...');
    await client!.join(appId, channel, token, null);
    console.log('✅ Successfully joined channel!');
    
    // Create local tracks
    console.log('🎥 Creating local tracks...');
    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();
    console.log('✅ Local tracks created:', localTracks.length);
    
    // Publish tracks
    console.log('📡 Publishing tracks...');
    await client!.publish(localTracks);
    console.log('✅ Local tracks published successfully');
    
    isJoined = true;
    console.log('🎉 Successfully joined call!');
    
    return { client: client!, localTracks };
    
  } catch (error) {
    console.error('💥 Failed to join call:', error);
    throw error;
  }
};

// Leave call
export const leaveCall = async (): Promise<void> => {
  try {
    console.log('Leaving call...');
    
    // Close local tracks
    localTracks.forEach(track => {
      track.close();
      console.log('Closed track:', track.trackMediaType);
    });
    
    // Leave channel
    if (client && isJoined) {
      await client.leave();
      console.log('Left channel successfully');
    }
    
    // Reset variables
    localTracks = [];
    isJoined = false;
    
  } catch (error) {
    console.error('Failed to leave call:', error);
    throw error;
  }
};

// Toggle microphone
export const toggleMicrophone = async (): Promise<boolean> => {
  try {
    const audioTrack = localTracks.find(track => track.trackMediaType === 'audio') as IMicrophoneAudioTrack;
    if (audioTrack) {
      const enabled = !audioTrack.enabled;
      await audioTrack.setEnabled(enabled);
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
    const videoTrack = localTracks.find(track => track.trackMediaType === 'video') as ICameraVideoTrack;
    if (videoTrack) {
      const enabled = !videoTrack.enabled;
      await videoTrack.setEnabled(enabled);
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
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    const screenTrack = await AgoraRTC.createScreenVideoTrack({}, 'auto');
    
    // Unpublish current video track
    const videoTrack = localTracks.find(track => track.trackMediaType === 'video');
    if (videoTrack) {
      await client.unpublish(videoTrack);
      videoTrack.close();
    }
    
    // Publish screen track
    await client.publish(screenTrack);
    
    // Replace video track in localTracks
    const videoIndex = localTracks.findIndex(track => track.trackMediaType === 'video');
    if (videoIndex !== -1) {
      localTracks[videoIndex] = screenTrack as ICameraVideoTrack;
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
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    const videoTrack = localTracks.find(track => track.trackMediaType === 'video') as ICameraVideoTrack;
    if (videoTrack) {
      await client.unpublish(videoTrack);
      videoTrack.close();
      
      // Create new camera track
      const newVideoTrack = await AgoraRTC.createCameraVideoTrack();
      await client.publish(newVideoTrack);
      
      // Replace video track in localTracks
      const videoIndex = localTracks.findIndex(track => track.trackMediaType === 'video');
      if (videoIndex !== -1) {
        localTracks[videoIndex] = newVideoTrack;
      }
      
      console.log('Screen sharing stopped');
    }
  } catch (error) {
    console.error('Failed to stop screen sharing:', error);
    throw error;
  }
};

// Get local video track for display
export const getLocalVideoTrack = (): ICameraVideoTrack | null => {
  return localTracks.find(track => track.trackMediaType === 'video') as ICameraVideoTrack || null;
};

// Get local audio track
export const getLocalAudioTrack = (): IMicrophoneAudioTrack | null => {
  return localTracks.find(track => track.trackMediaType === 'audio') as IMicrophoneAudioTrack || null;
};

// Check if client is connected
export const isConnected = (): boolean => {
  return client ? client.connectionState === 'CONNECTED' : false;
};

// Check if joined
export const isChannelJoined = (): boolean => {
  return isJoined;
};

// Get client instance
export const getClient = (): IAgoraRTCClient | null => {
  return client;
};

// Clean up resources
export const cleanup = (): void => {
  if (client) {
    client.removeAllListeners();
    client = null;
  }
  localTracks.forEach(track => track.close());
  localTracks = [];
  isJoined = false;
};
