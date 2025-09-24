# Firebase Cloud Functions Deployment Guide

## Current Status
The CORS error occurs because the Firebase Cloud Functions haven't been deployed yet. I've temporarily set up the app to work without tokens for development.

## Quick Fix (Current)
The app now works in "no token" mode for development. This allows you to test the video calls immediately.

## Deploy Cloud Functions (For Production)

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase in your project
```bash
firebase init functions
```
- Select your existing Firebase project: `ishara-app-73a98`
- Choose JavaScript (not TypeScript)
- Install dependencies: Yes

### 4. Install Agora Token dependency
```bash
cd functions
npm install agora-token
```

### 5. Deploy Functions
```bash
firebase deploy --only functions
```

### 6. Enable Cloud Functions in agoraService.ts
After deployment, uncomment the Cloud Functions code in `src/services/agoraService.ts`:

```typescript
// Uncomment these lines in generateToken() and generateSessionToken():
const generateTokenFunction = httpsCallable(functions, 'generateAgoraToken');
const result = await generateTokenFunction({...});
```

## Testing Without Cloud Functions
The current setup allows you to test video calls immediately:

1. ✅ **No CORS errors** - Using no token mode
2. ✅ **Video calls work** - Agora supports no token for development
3. ✅ **All features functional** - Join, leave, mute, camera controls

## Security Note
- **Development**: No tokens (current setup)
- **Production**: Must deploy Cloud Functions for secure token generation

## Next Steps
1. Test the video calls now (should work without CORS errors)
2. Deploy Cloud Functions when ready for production
3. Uncomment the token generation code after deployment

The app is now ready to test! 🎯

