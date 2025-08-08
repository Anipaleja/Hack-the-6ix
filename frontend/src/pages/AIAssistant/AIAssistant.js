import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Psychology, Chat } from '@mui/icons-material';

const AIAssistant = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          🤖 AI Health Assistant
        </Typography>
        <Button
          variant="contained"
          startIcon={<Chat />}
          onClick={() => alert('Start new conversation functionality would go here')}
        >
          New Chat
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Psychology sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              AI-Powered Health Assistant
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Your personal health AI assistant can help with:
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              • Answer health-related questions<br />
              • Medication interaction checks<br />
              • Symptom analysis and guidance<br />
              • Health goal recommendations<br />
              • Emergency situation detection<br />
              • Personalized health insights based on your data
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AIAssistant;
