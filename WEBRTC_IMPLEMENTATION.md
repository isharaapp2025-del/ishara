# WebRTC Implementation for Ishara Video Calls

This document describes the WebRTC implementation that replaces Agora for 1:1 video calls in the Ishara application.

## Overview

The implementation uses WebRTC for peer-to-peer video/audio communication with Firestore as the signaling server. This eliminates the need for Agora SDK and reduces costs while maintaining high-quality video calls.

## Architecture

### Components

1. **WebRTCService** (`src/services/webrtcService.ts`) - Core WebRTC functionality
2. **VideoCall Component** (`src/components/VideoCall.tsx`) - React UI component
3. **Call Service** (`src/services/callService.ts`) - Firestore integration
4. **Firestore Rules** (`firestore.rules`) - Security rules for signaling data

### Data Flow

1. **Session Confirmation**: When a session is confirmed, a CALLS document is created in Firestore
2. **Call Initiation**: The deaf/mute user (caller) creates an SDP offer and stores it in Firestore
3. **Call Answer**: The interpreter (callee) reads the offer, creates an answer, and stores it in Firestore
4. **ICE Exchange**: Both peers exchange ICE candidates through Firestore subcollections
5. **Media Flow**: Once connection is established, media flows directly peer-to-peer

## Firestore Schema

### CALLS Collection

```
CALLS/{sessionId}
├── offer: { type: "offer", sdp: "<SDP string>", from: uid, createdAt: timestamp }
├── answer: { type: "answer", sdp: "<SDP string>", from: uid, createdAt: timestamp }
├── sessionId: string
├── callerUid: string
├── calleeUid?: string
├── status: "active" | "ended" | "expired"
├── createdAt: timestamp
├── endedAt?: timestamp
├── callerCandidates/ (subcollection)
│   └── {candidateId}: { candidate: <ICECandidate JSON>, createdAt: timestamp }
└── calleeCandidates/ (subcollection)
    └── {candidateId}: { candidate: <ICECandidate JSON>, createdAt: timestamp }
```

## Usage

### Basic Implementation

```typescript
import { WebRTCService } from '../services/webrtcService';

// Create service instance
const webrtc = new WebRTCService();

// Start local media
const { localStream, remoteStream } = await webrtc.startLocalStream();

// Create peer connection
webrtc.createPeerConnection((remoteStream) => {
  // Handle remote stream
  remoteVideoElement.srcObject = remoteStream;
});

// As caller (deaf/mute user)
await webrtc.createCall(sessionId, userId);

// As callee (interpreter)
await webrtc.answerCall(sessionId, userId);
```

### React Component Usage

```typescript
<VideoCall 
  sessionId="session123"
  currentUid="user456"
  role="deaf_mute" // or "interpreter"
  onCallEnd={() => navigate('/dashboard')}
/>
```

## Features

### Core Features
- ✅ 1:1 video calls
- ✅ Audio/video toggle
- ✅ Screen sharing
- ✅ Mute/unmute
- ✅ Connection state monitoring
- ✅ Automatic cleanup

### Advanced Features
- ✅ ICE candidate exchange
- ✅ Connection state handling
- ✅ Error handling and recovery
- ✅ Firestore security rules
- ✅ Automatic cleanup on disconnect

## Configuration

### ICE Servers

The implementation uses Google's public STUN server by default:

```typescript
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" }
];
```

For production, add a TURN server for better NAT traversal:

```typescript
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { 
    urls: "turn:your-turn.example.com:3478", 
    username: "user", 
    credential: "pass" 
  }
];
```

### TURN Server Options

1. **Self-hosted coturn** - Cost: ~$5/month VM + bandwidth
2. **Twilio NAT Traversal** - Paid service with free trial
3. **Xirsys** - Free tier available
4. **Google Cloud TURN** - Managed service

## Security

### Firestore Rules

The implementation includes comprehensive security rules:

```javascript
match /CALLS/{sessionId} {
  function isParticipant() {
    return exists(/databases/$(database)/documents/sessions/$(sessionId)) &&
      (get(/databases/$(database)/documents/sessions/$(sessionId)).data.user_id == request.auth.uid ||
       get(/databases/$(database)/documents/sessions/$(sessionId)).data.interpreter_id == request.auth.uid);
  }

  allow read, write: if request.auth != null && isParticipant();
}
```

### Privacy Considerations

- Signaling data is automatically cleaned up after calls
- No media is stored in Firestore
- All media flows peer-to-peer
- HTTPS required for WebRTC

## Testing

### Test Scenarios

1. **Same Network**: Both users on same WiFi
2. **Different Networks**: WiFi ↔ Cellular
3. **NAT Traversal**: Users behind different NATs
4. **Browser Compatibility**: Chrome, Firefox, Safari
5. **Permission Handling**: Camera/mic denied scenarios
6. **Network Interruption**: Connection drops and recovery

### Testing Checklist

- [ ] Local network calls work
- [ ] Cross-network calls work
- [ ] Camera/mic permissions handled
- [ ] Screen sharing works
- [ ] Mute/unmute functions
- [ ] Call cleanup on disconnect
- [ ] Error handling for failed connections
- [ ] Multiple browser support

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check TURN server configuration
   - Verify Firestore rules
   - Check browser console for errors

2. **No Remote Video**
   - Verify ICE candidates are being exchanged
   - Check peer connection state
   - Ensure remote stream is properly set

3. **Permission Denied**
   - Handle getUserMedia errors gracefully
   - Provide fallback UI for denied permissions

### Debug Tools

```typescript
// Check connection state
console.log('Connection state:', webrtc.isConnected());

// Check peer connection state
console.log('ICE state:', pc.iceConnectionState);
console.log('Connection state:', pc.connectionState);
```

## Migration from Agora

### Changes Made

1. **Removed Agora SDK dependency**
2. **Updated VideoCall component props**
3. **Replaced token-based authentication with session-based**
4. **Updated Firestore rules for CALLS collection**
5. **Simplified call service (no token generation needed)**

### Breaking Changes

- VideoCall component now requires `sessionId`, `currentUid`, and `role` instead of `channel` and `token`
- CallRoom component updated to work with new props
- Firestore collection name changed from `calls` to `CALLS`

## Performance Considerations

### Bandwidth Usage

- Video: ~500Kbps - 2Mbps per participant
- Audio: ~50Kbps per participant
- Signaling: Minimal (only SDP and ICE candidates)

### Optimization Tips

1. **Adaptive Bitrate**: WebRTC automatically adjusts quality based on network
2. **Codec Selection**: VP8 is used by default (good balance of quality/bandwidth)
3. **Resolution**: Default 1280x720, can be adjusted based on needs

## Future Enhancements

### Planned Features

- [ ] Recording functionality
- [ ] Chat during calls
- [ ] Call quality metrics
- [ ] Reconnection handling
- [ ] Multiple participants (group calls)
- [ ] Custom TURN server integration

### Monitoring

- [ ] Call success/failure rates
- [ ] Connection quality metrics
- [ ] ICE candidate exchange timing
- [ ] Firestore read/write costs

## Support

For issues or questions:

1. Check browser console for errors
2. Verify Firestore rules are deployed
3. Test with TURN server if NAT issues occur
4. Check network connectivity and permissions

## Cost Comparison

### Agora vs WebRTC

| Feature | Agora | WebRTC + Firestore |
|---------|-------|-------------------|
| Video Calls | $0.99/1000 minutes | $0.18/1000 minutes (Firestore) |
| Signaling | Included | Minimal Firestore costs |
| Infrastructure | Managed | Self-managed |
| Scalability | Automatic | Manual TURN scaling |

**Estimated Savings**: 80-90% reduction in video call costs
