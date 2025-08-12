import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Chip,
  Paper,
  Divider,
  CircularProgress,
  Grid
} from '@mui/material';
import {
  Psychology,
  Chat,
  Send,
  Person,
  SmartToy,
  Clear,
  Lightbulb,
  LocalPharmacy,
  Monitor,
  Warning
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

const AIAssistant = () => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI Health Assistant. I can help you with medication questions, symptom analysis, health guidance, and more. How can I assist you today?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const quickQuestions = [
    "What are the side effects of my medications?",
    "Can I take ibuprofen with my current medications?",
    "What should I do if I miss a dose?",
    "Explain my latest health metrics",
    "Should I be concerned about my symptoms?",
    "What exercises are safe for my condition?"
  ];

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        text: getAIResponse(inputText),
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const getAIResponse = (question) => {
    const responses = {
      medication: "Based on your current medication profile, I can help you understand potential interactions and side effects. For specific medical advice, please consult with your healthcare provider.",
      symptoms: "I understand you're experiencing symptoms. While I can provide general guidance, it's important to consult with a healthcare professional for proper diagnosis and treatment.",
      health: "Your health data shows interesting patterns. I recommend discussing these trends with your doctor during your next appointment.",
      emergency: "If this is a medical emergency, please call 911 immediately. For urgent but non-emergency situations, contact your healthcare provider or visit an urgent care center.",
      default: "Thank you for your question. Based on the information available, I recommend consulting with your healthcare provider for personalized medical advice. I can help you prepare questions for your next appointment."
    };

    const lowerQuestion = question.toLowerCase();
    if (lowerQuestion.includes('medication') || lowerQuestion.includes('drug')) {
      return responses.medication;
    } else if (lowerQuestion.includes('symptom') || lowerQuestion.includes('pain')) {
      return responses.symptoms;
    } else if (lowerQuestion.includes('health') || lowerQuestion.includes('data')) {
      return responses.health;
    } else if (lowerQuestion.includes('emergency') || lowerQuestion.includes('urgent')) {
      return responses.emergency;
    }
    return responses.default;
  };

  const handleQuickQuestion = (question) => {
    setInputText(question);
  };

  const clearChat = () => {
    setMessages([{
      id: 1,
      text: "Hello! I'm your AI Health Assistant. I can help you with medication questions, symptom analysis, health guidance, and more. How can I assist you today?",
      sender: 'ai',
      timestamp: new Date()
    }]);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          AI Health Assistant
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Clear />}
            onClick={clearChat}
          >
            Clear Chat
          </Button>
          <Button
            variant="contained"
            startIcon={<Chat />}
            onClick={() => setInputText('')}
          >
            New Chat
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Chat Interface */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            {/* Messages */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <List>
                {messages.map((message) => (
                  <ListItem
                    key={message.id}
                    sx={{
                      flexDirection: 'column',
                      alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start',
                      mb: 1
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', maxWidth: '80%' }}>
                      {message.sender === 'ai' && (
                        <Avatar sx={{ bgcolor: 'primary.main', mr: 1, mt: 0.5 }}>
                          <SmartToy />
                        </Avatar>
                      )}
                      <Paper
                        sx={{
                          p: 2,
                          bgcolor: message.sender === 'user' ? 'primary.main' : 'background.paper',
                          color: message.sender === 'user' ? 'white' : 'text.primary',
                          borderRadius: 2,
                          ml: message.sender === 'user' ? 'auto' : 0,
                          mr: message.sender === 'ai' ? 'auto' : 0
                        }}
                      >
                        <Typography variant="body2">{message.text}</Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 1,
                            opacity: 0.7,
                            fontSize: '0.75rem'
                          }}
                        >
                          {message.timestamp.toLocaleTimeString()}
                        </Typography>
                      </Paper>
                      {message.sender === 'user' && (
                        <Avatar sx={{ bgcolor: 'secondary.main', ml: 1, mt: 0.5 }}>
                          <Person />
                        </Avatar>
                      )}
                    </Box>
                  </ListItem>
                ))}
                {isLoading && (
                  <ListItem sx={{ justifyContent: 'flex-start' }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 1 }}>
                      <SmartToy />
                    </Avatar>
                    <Paper sx={{ p: 2, borderRadius: 2 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2" sx={{ ml: 1, display: 'inline' }}>
                        AI is thinking...
                      </Typography>
                    </Paper>
                  </ListItem>
                )}
              </List>
              <div ref={messagesEndRef} />
            </Box>

            {/* Input */}
            <Divider />
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Ask me about your health, medications, symptoms..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isLoading}
                />
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isLoading}
                >
                  <Send />
                </IconButton>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Quick Questions */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Lightbulb color="primary" />
                Quick Questions
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {quickQuestions.map((question, index) => (
                  <Chip
                    key={index}
                    label={question}
                    variant="outlined"
                    onClick={() => handleQuickQuestion(question)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* AI Capabilities */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Psychology color="primary" />
                AI Capabilities
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.light' }}>
                      <LocalPharmacy />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Medication Analysis"
                    secondary="Drug interactions, side effects, dosage guidance"
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'info.light' }}>
                      <Monitor />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Health Data Insights"
                    secondary="Pattern recognition, trend analysis"
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'warning.light' }}>
                      <Warning />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Symptom Assessment"
                    secondary="General guidance and recommendations"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="warning.main" gutterBottom>
                Important Notice
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This AI assistant provides general health information and should not replace professional medical advice. Always consult with your healthcare provider for medical decisions.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AIAssistant;
