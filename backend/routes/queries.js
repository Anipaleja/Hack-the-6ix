const express = require('express');
const router = express.Router();
const Query = require('../models/Query');
const Family = require('../models/Family');
const AIHealthAssistant = require('../services/aiHealthAssistant');
const NotificationService = require('../services/notificationService');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

// Initialize services
const aiAssistant = new AIHealthAssistant();

router.use(auth);

// Create a new health query
router.post('/', rateLimiter(10, 60), async (req, res) => {
  try {
    const { question, category, urgency, metadata } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Question is required' 
      });
    }

    // Create query record
    const query = new Query({
      userId: req.user.id,
      question: question.trim(),
      category: category || 'general',
      urgency: urgency || 'normal',
      metadata: metadata || {},
      status: 'processing'
    });

    await query.save();

    // Process query with AI assistant (async)
    setImmediate(async () => {
      try {
        const response = await aiAssistant.processHealthQuery(
          req.user.id,
          question,
          { category, urgency, metadata }
        );

        // Update query with response
        query.response = response.answer;
        query.status = response.status || 'completed';
        query.confidence = response.confidence;
        query.sources = response.sources || [];
        query.recommendations = response.recommendations || [];
        query.followUpQuestions = response.followUpQuestions || [];
        query.respondedAt = new Date();

        await query.save();

        // Send real-time update to user
        req.io.to(req.user.id).emit('queryResponse', {
          queryId: query._id,
          response: response.answer,
          recommendations: response.recommendations,
          followUpQuestions: response.followUpQuestions,
          status: query.status
        });

        // Notify family if urgent or health concern
        if (urgency === 'urgent' || response.requiresFamilyNotification) {
          await notifyFamilyOfQuery(req.user.id, query, response);
        }

      } catch (error) {
        console.error('Error processing query:', error);
        
        query.status = 'error';
        query.response = 'Sorry, I encountered an error processing your question. Please try again later.';
        await query.save();

        req.io.to(req.user.id).emit('queryError', {
          queryId: query._id,
          error: 'Processing failed'
        });
      }
    });

    res.status(201).json({
      success: true,
      data: {
        queryId: query._id,
        status: 'processing',
        message: 'Your question is being processed. You\'ll receive a response shortly.'
      }
    });

  } catch (error) {
    console.error('Error creating query:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create query' 
    });
  }
});

// Get user's query history
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, status } = req.query;
    
    const filter = { userId: req.user.id };
    if (category) filter.category = category;
    if (status) filter.status = status;

    const queries = await Query.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-metadata.sensitiveData');

    const total = await Query.countDocuments(filter);

    res.json({
      success: true,
      data: {
        queries,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch queries' 
    });
  }
});

// Get specific query by ID
router.get('/:queryId', async (req, res) => {
  try {
    const query = await Query.findOne({
      _id: req.params.queryId,
      userId: req.user.id
    });

    if (!query) {
      return res.status(404).json({ 
        success: false, 
        error: 'Query not found' 
      });
    }

    res.json({
      success: true,
      data: query
    });

  } catch (error) {
    console.error('Error fetching query:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch query' 
    });
  }
});

// Rate a query response
router.post('/:queryId/rate', async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'Rating must be between 1 and 5' 
      });
    }

    const query = await Query.findOne({
      _id: req.params.queryId,
      userId: req.user.id
    });

    if (!query) {
      return res.status(404).json({ 
        success: false, 
        error: 'Query not found' 
      });
    }

    query.feedback = {
      rating,
      comment: feedback || '',
      submittedAt: new Date()
    };

    await query.save();

    res.json({
      success: true,
      message: 'Thank you for your feedback!'
    });

  } catch (error) {
    console.error('Error rating query:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit rating' 
    });
  }
});

// Follow up on a previous query
router.post('/:queryId/follow-up', rateLimiter(10, 60), async (req, res) => {
  try {
    const { followUpQuestion } = req.body;

    if (!followUpQuestion || followUpQuestion.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Follow-up question is required' 
      });
    }

    const originalQuery = await Query.findOne({
      _id: req.params.queryId,
      userId: req.user.id
    });

    if (!originalQuery) {
      return res.status(404).json({ 
        success: false, 
        error: 'Original query not found' 
      });
    }

    // Create new query with reference to original
    const followUpQuery = new Query({
      userId: req.user.id,
      question: followUpQuestion.trim(),
      category: originalQuery.category,
      urgency: 'normal',
      status: 'processing',
      isFollowUp: true,
      originalQueryId: originalQuery._id,
      metadata: {
        previousContext: {
          originalQuestion: originalQuery.question,
          originalResponse: originalQuery.response
        }
      }
    });

    await followUpQuery.save();

    // Process with AI (async)
    setImmediate(async () => {
      try {
        const response = await aiAssistant.processHealthQuery(
          req.user.id,
          followUpQuestion,
          {
            isFollowUp: true,
            previousContext: {
              question: originalQuery.question,
              response: originalQuery.response
            }
          }
        );

        followUpQuery.response = response.answer;
        followUpQuery.status = 'completed';
        followUpQuery.confidence = response.confidence;
        followUpQuery.sources = response.sources || [];
        followUpQuery.recommendations = response.recommendations || [];
        followUpQuery.respondedAt = new Date();

        await followUpQuery.save();

        req.io.to(req.user.id).emit('queryResponse', {
          queryId: followUpQuery._id,
          response: response.answer,
          recommendations: response.recommendations,
          isFollowUp: true,
          originalQueryId: originalQuery._id
        });

      } catch (error) {
        console.error('Error processing follow-up query:', error);
        
        followUpQuery.status = 'error';
        followUpQuery.response = 'Sorry, I encountered an error processing your follow-up question.';
        await followUpQuery.save();
      }
    });

    res.status(201).json({
      success: true,
      data: {
        queryId: followUpQuery._id,
        status: 'processing',
        message: 'Your follow-up question is being processed.'
      }
    });

  } catch (error) {
    console.error('Error creating follow-up query:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create follow-up query' 
    });
  }
});

// Get query analytics/insights
router.get('/analytics/insights', async (req, res) => {
  try {
    const { timeframe = '30' } = req.query;
    const daysBack = parseInt(timeframe);
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const analytics = await Query.aggregate([
      {
        $match: {
          userId: req.user.id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalQueries: { $sum: 1 },
          avgRating: { $avg: '$feedback.rating' },
          categoryBreakdown: {
            $push: '$category'
          },
          urgencyBreakdown: {
            $push: '$urgency'
          },
          completedQueries: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const categoryStats = await Query.aggregate([
      {
        $match: {
          userId: req.user.id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRating: { $avg: '$feedback.rating' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        summary: analytics[0] || {
          totalQueries: 0,
          avgRating: 0,
          completedQueries: 0
        },
        categoryStats,
        timeframe: `${daysBack} days`
      }
    });

  } catch (error) {
    console.error('Error fetching query analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch analytics' 
    });
  }
});

// Delete a query
router.delete('/:queryId', async (req, res) => {
  try {
    const query = await Query.findOneAndDelete({
      _id: req.params.queryId,
      userId: req.user.id
    });

    if (!query) {
      return res.status(404).json({ 
        success: false, 
        error: 'Query not found' 
      });
    }

    res.json({
      success: true,
      message: 'Query deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting query:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete query' 
    });
  }
});

// Helper function to notify family members of important queries
async function notifyFamilyOfQuery(userId, query, response) {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId).populate('familyId');
    
    if (!user.familyId) return;

    const family = await Family.findById(user.familyId).populate('members.user');
    const notificationService = new NotificationService();

    for (const member of family.members) {
      if (member.permissions.receiveHealthAlerts && 
          member.user._id.toString() !== userId.toString()) {
        
        const notificationData = {
          title: 'Health Query Alert',
          body: `${user.firstName} asked a health question that may need attention`,
          data: {
            type: 'health_query',
            queryId: query._id.toString(),
            patientId: userId.toString(),
            urgency: query.urgency
          },
          priority: query.urgency === 'urgent' ? 'high' : 'normal'
        };

        await notificationService.sendToUser(member.user._id, notificationData);
      }
    }

  } catch (error) {
    console.error('Error notifying family of query:', error);
  }
}

module.exports = router;
