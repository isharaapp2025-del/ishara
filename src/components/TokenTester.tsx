import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, Stack } from '@mui/material';
import { joinCall, leaveCall, AGORA_CONFIG } from '../services/agoraService';

const TokenTester = () => {
  const [channel, setChannel] = useState('');
  const [token, setToken] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    try {
      setError('');
      await joinCall(AGORA_CONFIG.appId, channel, token);
      setIsJoined(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveCall();
      setIsJoined(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Agora Token Tester
      </Typography>
      
      <Stack spacing={2}>
        <TextField
          label="Channel Name"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          placeholder="e.g., test-channel-123"
          fullWidth
        />
        
        <TextField
          label="Temporary Token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste token from Agora Console"
          fullWidth
          multiline
          rows={3}
        />
        
        <Button
          variant="contained"
          onClick={handleJoin}
          disabled={!channel || !token || isJoined}
          fullWidth
        >
          {isJoined ? 'Already Joined' : 'Join Call'}
        </Button>
        
        {isJoined && (
          <Button
            variant="outlined"
            onClick={handleLeave}
            color="error"
            fullWidth
          >
            Leave Call
          </Button>
        )}
        
        {error && (
          <Alert severity="error">{error}</Alert>
        )}
        
        <Alert severity="info">
          <Typography variant="subtitle2" gutterBottom>
            How to get a token:
          </Typography>
          <Typography variant="body2">
            1. Go to Agora Console → Project Management → Your Project → Config
            <br />
            2. Under "Generate a Temp Token", enter channel name
            <br />
            3. Choose Role: Publisher
            <br />
            4. Click Generate and copy the token
          </Typography>
        </Alert>
      </Stack>
    </Box>
  );
};

export default TokenTester;

