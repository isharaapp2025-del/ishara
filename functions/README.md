# Firebase Cloud Functions Setup

This project uses Firebase Cloud Functions to generate secure Agora tokens for video calls.

## Setup Instructions

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase Functions
```bash
firebase init functions
```

### 4. Install Dependencies
```bash
cd functions
npm install
```

### 5. Deploy Functions
```bash
firebase deploy --only functions
```

## Functions

### `generateAgoraToken`
Generates a general-purpose Agora token for any channel.

**Parameters:**
- `channelName` (string): The Agora channel name
- `uid` (string): User ID
- `role` (string, optional): 'publisher' or 'subscriber' (default: 'publisher')

**Returns:**
- `token`: Generated Agora token
- `appId`: Agora App ID
- `channelName`: Channel name
- `uid`: User ID
- `expirationTime`: Token expiration timestamp

### `generateSessionToken`
Generates a secure token for a specific session.

**Parameters:**
- `sessionId` (string): The session ID (used as channel name)

**Returns:**
- `token`: Generated Agora token
- `appId`: Agora App ID
- `channelName`: Session ID
- `uid`: Current user ID
- `expirationTime`: Token expiration timestamp

## Security Features

- ✅ User authentication required
- ✅ Session ownership verification
- ✅ Session status validation (must be 'confirmed')
- ✅ Token expiration (2 hours for sessions, 1 hour for general)
- ✅ Proper error handling

## Environment Variables

Make sure your Agora credentials are configured in the Cloud Function:
- `AGORA_APP_ID`: Your Agora App ID
- `AGORA_APP_CERTIFICATE`: Your Agora App Certificate

## Testing

You can test the functions locally:
```bash
cd functions
npm run serve
```

Then use the Firebase Functions emulator for testing.

