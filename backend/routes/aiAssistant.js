const express = require('express');
const { authenticateToken } = require('./auth');
const OllamaHealthAssistant = require('../services/ollamaHealthAssistant');

const router = express.Router();

// Create AI assistant instance but defer initialization
let aiAssistant = null;

// Initialize function that creates assistant on first use
async function getAiAssistant() {
  if (!aiAssistant) {
    aiAssistant = new OllamaHealthAssistant();
    await aiAssistant.trainWithHealthcareData();
  }
  return aiAssistant;
}

// Process health query
router.post('/query', authenticateToken, async (req, res) => {
  try {
    const { query, context = {} } = req.body;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({
        error: 'Query is required'
      });
    }

    console.log(`🤖 AI Assistant Query: "${query.substring(0, 50)}..."`);
    
    // Get or initialize AI assistant
    const assistant = await getAiAssistant();
    
    // Process the health query
    const result = await assistant.processHealthQuery(query, {
      userId: req.user.userId,
      ...context
    });

    console.log(`✅ AI Response generated with confidence: ${result.confidence}`);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ AI Assistant Error:', error);

    // Return a helpful fallback response
    res.json({
      success: false,
      data: {
        response: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment or consult your healthcare provider for immediate assistance.",
        confidence: 0.0,
        category: 'system_error',
        urgency: 'low',
        model: 'fallback',
        processingTime: 0,
        disclaimer: "This is a fallback response due to technical issues. Please seek professional medical advice for health concerns."
      },
      error: 'AI service temporarily unavailable'
    });
  }
});

// Get AI assistant capabilities
router.get('/capabilities', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    data: {
      model: 'llama3.2:3b',
      capabilities: [
        'Medication information and interactions',
        'General health questions',
        'Symptom guidance (non-diagnostic)',
        'Wellness and prevention tips',
        'Healthcare resource recommendations'
      ],
      limitations: [
        'Cannot diagnose medical conditions',
        'Cannot prescribe medications',
        'Cannot replace professional medical advice',
        'Emergency situations require immediate medical attention'
      ],
      languages: ['English'],
      responseTypes: [
        'Informational guidance',
        'Safety recommendations',
        'Healthcare resource suggestions',
        'Medication management tips'
      ]
    }
  });
});

// Health check for AI service
router.get('/health', async (req, res) => {
  try {
    // Get or initialize AI assistant
    const assistant = await getAiAssistant();
    
    // Test a simple query to check if Ollama is running
    const testResult = await assistant.processHealthQuery(
      "Hello, are you working?",
      { _id: 'test', firstName: 'Test' },
      {}
    );
    
    res.json({
      success: true,
      status: 'healthy',
      model: testResult.model,
      responseTime: testResult.processingTime
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'AI service unavailable',
      details: error.message
    });
  }
});

// Get conversation history (placeholder for future implementation)
router.get('/history', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    data: {
      conversations: [],
      message: 'Conversation history feature coming soon'
    }
  });
});

module.exports = router;
