# PeerJS Implementation for Ishara

## Overview

This implementation replaces Agora with PeerJS for WebRTC video calling in the Ishara application. PeerJS simplifies WebRTC by providing:

- **Built-in signaling server** (no need for custom Firestore signaling)
- **Simplified peer connection handling** (work with peer IDs instead of raw offers/answers)
- **Free development server** (PeerJS Cloud)
- **Easy deployment** (can host your own PeerServer)

## Architecture

### 1. PeerJS Service (`src/services/peerjsService.ts`)

The main service that handles:
- Peer initialization and connection
- Media stream management (audio/video)
- Screen sharing
- Data channel communication
- Call controls (mute, camera toggle, etc.)

### 2. Call Service (`src/services/callService.ts`)

Updated to work with PeerJS:
- Stores peer IDs instead of Agora tokens
- Manages call lifecycle in Firestore
- Handles peer ID mapping between users

### 3. Video Call Component (`src/components/VideoCall.tsx`)

Completely rewritten to use PeerJS:
- Initializes PeerJS peer on mount
- Handles caller/callee logic
- Manages media streams and UI controls
- Provides real-time call status

## How It Works

### Call Flow

1. **Session Confirmation**: When an interpreter accepts a session, the status is updated to "confirmed"

2. **First Participant Joins**: 
   - Deaf/mute user joins → Creates call document with their peer ID
   - Interpreter joins → Updates call document with their peer ID

3. **Call Initiation**:
   - Deaf/mute user (caller) calls interpreter's peer ID
   - Interpreter (callee) receives the call and answers automatically

4. **Media Exchange**: WebRTC handles peer-to-peer media streaming

### Firestore Schema

```typescript
interface PeerJSCallData {
  sessionId: string;
  callerUid: string;
  calleeUid?: string;
  callerPeerId: string;
  calleePeerId?: string;
  status: 'active' | 'ended' | 'expired';
  createdAt: Date;
  endedAt?: Date;
}
```

## Configuration

### Development (Current)
- Uses PeerJS Cloud server (free)
- No additional setup required

### Production
You can deploy your own PeerServer to:
- **Heroku**: Free tier available
- **Render**: Free tier available  
- **Railway**: Free tier available
- **Vercel**: Serverless functions

## Key Features

✅ **Video/Audio Calling**: Full duplex communication
✅ **Screen Sharing**: Share screen during calls
✅ **Call Controls**: Mute, camera toggle, end call
✅ **Real-time Status**: Connection status and peer information
✅ **Automatic Cleanup**: Resources cleaned up on call end
✅ **Error Handling**: Comprehensive error management

## Testing

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Test the flow**:
   - Book a session as deaf/mute user
   - Accept the session as interpreter
   - Both users click "Join Call"
   - Video call should work with PeerJS

## Migration from Agora

### What Changed
- ❌ Removed Agora SDK dependency
- ❌ Removed token generation logic
- ❌ Removed channel-based calling
- ✅ Added PeerJS SDK
- ✅ Added peer ID-based calling
- ✅ Simplified signaling (no custom Firestore signaling)

### Benefits
- **Simpler**: No token management
- **Free**: No Agora costs
- **Flexible**: Can host your own signaling server
- **Reliable**: PeerJS handles connection management

## Troubleshooting

### Common Issues

1. **"Peer not initialized"**
   - Check if PeerJS server is accessible
   - Verify network connection

2. **"No remote stream"**
   - Ensure both participants have joined
   - Check browser permissions for camera/microphone

3. **"Call failed"**
   - Verify peer IDs are correctly stored in Firestore
   - Check console for detailed error messages

### Debug Mode

Enable debug logging by opening browser console. The implementation provides detailed logs for:
- Peer initialization
- Call establishment
- Media stream handling
- Error conditions

## Future Enhancements

- [ ] Add call recording
- [ ] Implement chat during calls
- [ ] Add call quality indicators
- [ ] Implement call transfer
- [ ] Add multiple participant support


