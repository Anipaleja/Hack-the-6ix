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
    const currentQuestion = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      // Call our new Ollama AI backend
      const response = await fetch('/api/ai-assistant/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({
          query: currentQuestion,
          context: {
            timestamp: new Date().toISOString(),
            sessionId: `session_${Date.now()}`
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        const aiResponse = {
          id: messages.length + 2,
          text: result.data.response,
          sender: 'ai',
          timestamp: new Date(),
          confidence: result.data.confidence,
          category: result.data.category,
          urgency: result.data.urgency,
          model: result.data.model,
          processingTime: result.data.processingTime
        };
        
        setMessages(prev => [...prev, aiResponse]);
      } else {
        // Fallback response if AI service fails
        const fallbackResponse = {
          id: messages.length + 2,
          text: result.data?.response || "I apologize, but I'm experiencing technical difficulties. Please try again in a moment or consult your healthcare provider for immediate assistance.",
          sender: 'ai',
          timestamp: new Date(),
          isError: true
        };
        
        setMessages(prev => [...prev, fallbackResponse]);
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      
      // Network error fallback
      const errorResponse = {
        id: messages.length + 2,
        text: "I'm currently unable to connect to the AI service. Please check your internet connection and try again. For urgent health concerns, please contact your healthcare provider.",
        sender: 'ai',
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question) => {
    setInputText(question);
  };

  const clearChat = () => {
    setMessages([{
      id: 1,
      text: "Hello! I'm your AI Health Assistant powered by Llama 3.2. I can help you with medication questions, symptom analysis, health guidance, and more. How can I assist you today?",
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
                        
                        {/* AI Metadata Display */}
                        {message.sender === 'ai' && (message.confidence || message.isError) && (
                          <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'medium' }}>
                              {message.isError ? 'Service Status:' : 'AI Response Details:'}
                            </Typography>
                            
                            {message.isError ? (
                              <Chip
                                size="small"
                                label="Connection Error"
                                color="error"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            ) : (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                                {/* Confidence Score */}
                                <Chip
                                  size="small"
                                  label={`Confidence: ${Math.round(message.confidence * 100)}%`}
                                  color={message.confidence > 0.8 ? 'success' : message.confidence > 0.6 ? 'warning' : 'default'}
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem', height: 20 }}
                                />
                                
                                {/* Urgency Level */}
                                {message.urgency && (
                                  <Chip
                                    size="small"
                                    label={`Urgency: ${message.urgency}`}
                                    color={message.urgency === 'high' ? 'error' : message.urgency === 'medium' ? 'warning' : 'info'}
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem', height: 20 }}
                                  />
                                )}
                                
                                {/* Category */}
                                {message.category && (
                                  <Chip
                                    size="small"
                                    label={message.category}
                                    color="primary"
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem', height: 20 }}
                                  />
                                )}
                              </Box>
                            )}
                            
                            {!message.isError && (
                              <Typography variant="caption" sx={{ display: 'block', opacity: 0.7, fontSize: '0.65rem' }}>
                                {message.model && `Model: ${message.model}`}
                                {message.processingTime && ` • Response time: ${message.processingTime}ms`}
                              </Typography>
                            )}
                          </Box>
                        )}
                        
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
