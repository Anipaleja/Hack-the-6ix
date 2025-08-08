const OpenAI = require('openai');
const HealthData = require('../models/HealthData');
const Medication = require('../models/Medication');
const User = require('../models/User');

class AIHealthAssistant {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async processHealthQuery(query, user, context = {}) {
    try {
      const startTime = Date.now();
      
      // Gather user's health context
      const healthContext = await this.gatherHealthContext(user._id, context);
      
      // Analyze query urgency and category
      const queryAnalysis = this.analyzeQuery(query);
      
      // Build prompt with health context
      const prompt = this.buildHealthPrompt(query, healthContext, queryAnalysis);
      
      // Get AI response
      const aiResponse = await this.getAIResponse(prompt);
      
      // Post-process response
      const processedResponse = this.processAIResponse(aiResponse, queryAnalysis);
      
      const processingTime = Date.now() - startTime;
      
      return {
        response: processedResponse,
        context: healthContext,
        analysis: queryAnalysis,
        processingTime,
        model: 'gpt-4'
      };
    } catch (error) {
      console.error('AI Health Assistant error:', error);
      throw new Error('Failed to process health query');
    }
  }

  async gatherHealthContext(userId, additionalContext = {}) {
    try {
      // Get user's basic info and medical history
      const user = await User.findById(userId).select('medicalInfo dateOfBirth');
      
      // Get recent health data (last 7 days)
      const recentHealthData = await HealthData.find({
        user: userId,
        recordedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }).sort({ recordedAt: -1 }).limit(50);

      // Get current medications
      const medications = await Medication.find({
        patient: userId,
        isActive: true
      }).select('scientificName commonName dosage purpose sideEffects');

      // Calculate age
      const age = user.dateOfBirth ? 
        Math.floor((Date.now() - user.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

      // Aggregate recent vital signs
      const vitalSigns = this.aggregateVitalSigns(recentHealthData);
      
      // Get medication adherence
      const medicationAdherence = medications.map(med => ({
        name: med.commonName,
        adherenceRate: med.adherence?.adherenceRate || 0,
        purpose: med.purpose
      }));

      return {
        patient: {
          age,
          allergies: user.medicalInfo?.allergies || [],
          conditions: user.medicalInfo?.conditions || [],
          bloodType: user.medicalInfo?.bloodType
        },
        medications: medications.map(med => ({
          name: `${med.commonName} (${med.scientificName})`,
          dosage: `${med.dosage.amount}${med.dosage.unit}`,
          purpose: med.purpose,
          sideEffects: med.sideEffects
        })),
        recentVitals: vitalSigns,
        medicationAdherence,
        additionalContext
      };
    } catch (error) {
      console.error('Error gathering health context:', error);
      return {};
    }
  }

  aggregateVitalSigns(healthData) {
    const vitals = {
      heartRate: [],
      bloodPressure: [],
      steps: [],
      sleep: [],
      weight: []
    };

    healthData.forEach(data => {
      if (data.metrics.heartRate?.value) {
        vitals.heartRate.push({
          value: data.metrics.heartRate.value,
          date: data.recordedAt,
          context: data.metrics.heartRate.context
        });
      }
      
      if (data.metrics.bloodPressure?.systolic) {
        vitals.bloodPressure.push({
          systolic: data.metrics.bloodPressure.systolic,
          diastolic: data.metrics.bloodPressure.diastolic,
          date: data.recordedAt
        });
      }
      
      if (data.metrics.steps?.value) {
        vitals.steps.push({
          value: data.metrics.steps.value,
          date: data.recordedAt
        });
      }
      
      if (data.metrics.sleep?.duration) {
        vitals.sleep.push({
          duration: data.metrics.sleep.duration,
          quality: data.metrics.sleep.quality,
          date: data.recordedAt
        });
      }
      
      if (data.metrics.weight?.value) {
        vitals.weight.push({
          value: data.metrics.weight.value,
          unit: data.metrics.weight.unit,
          date: data.recordedAt
        });
      }
    });

    // Calculate averages for recent data
    return {
      averageHeartRate: this.calculateAverage(vitals.heartRate, 'value'),
      averageBloodPressure: {
        systolic: this.calculateAverage(vitals.bloodPressure, 'systolic'),
        diastolic: this.calculateAverage(vitals.bloodPressure, 'diastolic')
      },
      averageSteps: this.calculateAverage(vitals.steps, 'value'),
      averageSleepDuration: this.calculateAverage(vitals.sleep, 'duration'),
      recentTrends: this.calculateTrends(vitals)
    };
  }

  calculateAverage(data, field) {
    if (data.length === 0) return null;
    const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0);
    return Math.round(sum / data.length);
  }

  calculateTrends(vitals) {
    const trends = {};
    
    Object.keys(vitals).forEach(vital => {
      if (vitals[vital].length >= 2) {
        const recent = vitals[vital].slice(0, Math.ceil(vitals[vital].length / 2));
        const older = vitals[vital].slice(Math.ceil(vitals[vital].length / 2));
        
        const recentAvg = this.calculateAverage(recent, 'value');
        const olderAvg = this.calculateAverage(older, 'value');
        
        if (recentAvg && olderAvg) {
          const change = ((recentAvg - olderAvg) / olderAvg) * 100;
          trends[vital] = {
            direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
            changePercent: Math.round(change)
          };
        }
      }
    });
    
    return trends;
  }

  analyzeQuery(query) {
    const queryLower = query.toLowerCase();
    
    // Emergency keywords
    const emergencyKeywords = [
      'chest pain', 'heart attack', 'stroke', 'difficulty breathing', 'unconscious',
      'severe pain', 'bleeding heavily', 'overdose', 'allergic reaction', 'emergency'
    ];
    
    // High priority keywords
    const highPriorityKeywords = [
      'pain', 'fever', 'nausea', 'vomiting', 'dizziness', 'shortness of breath',
      'swelling', 'rash', 'infection', 'injury', 'urgent'
    ];
    
    // Medical categories
    const categories = {
      medication: ['medication', 'pill', 'dose', 'drug', 'prescription', 'side effect'],
      symptoms: ['symptom', 'feeling', 'pain', 'ache', 'sick', 'hurt'],
      emergency: ['emergency', 'urgent', 'help', 'critical', 'severe'],
      mental_health: ['anxiety', 'depression', 'stress', 'mood', 'mental', 'emotional'],
      nutrition: ['food', 'diet', 'nutrition', 'eating', 'vitamin', 'supplement'],
      exercise: ['exercise', 'workout', 'activity', 'fitness', 'movement']
    };
    
    // Determine urgency
    let urgency = 'medium';
    if (emergencyKeywords.some(keyword => queryLower.includes(keyword))) {
      urgency = 'emergency';
    } else if (highPriorityKeywords.some(keyword => queryLower.includes(keyword))) {
      urgency = 'high';
    }
    
    // Determine category
    let category = 'general_health';
    for (const [cat, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        category = cat;
        break;
      }
    }
    
    return {
      urgency,
      category,
      keywords: this.extractKeywords(query),
      isEmergency: urgency === 'emergency'
    };
  }

  extractKeywords(query) {
    // Simple keyword extraction
    const stopWords = ['i', 'am', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but', 'what', 'how', 'why', 'when', 'where'];
    return query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
  }

  buildHealthPrompt(query, healthContext, analysis) {
    return `You are a knowledgeable health assistant helping a patient understand their health concerns. 

PATIENT CONTEXT:
${healthContext.patient ? `
- Age: ${healthContext.patient.age || 'Unknown'}
- Known Conditions: ${healthContext.patient.conditions?.join(', ') || 'None reported'}
- Allergies: ${healthContext.patient.allergies?.join(', ') || 'None reported'}
- Blood Type: ${healthContext.patient.bloodType || 'Unknown'}
` : ''}

CURRENT MEDICATIONS:
${healthContext.medications?.map(med => `- ${med.name}: ${med.dosage}${med.purpose ? ` (for ${med.purpose})` : ''}`).join('\n') || 'None reported'}

RECENT HEALTH DATA:
${healthContext.recentVitals ? `
- Average Heart Rate: ${healthContext.recentVitals.averageHeartRate || 'N/A'} bpm
- Average Blood Pressure: ${healthContext.recentVitals.averageBloodPressure?.systolic || 'N/A'}/${healthContext.recentVitals.averageBloodPressure?.diastolic || 'N/A'} mmHg
- Average Daily Steps: ${healthContext.recentVitals.averageSteps || 'N/A'}
- Average Sleep: ${healthContext.recentVitals.averageSleepDuration ? Math.round(healthContext.recentVitals.averageSleepDuration / 60) : 'N/A'} hours
` : ''}

QUERY ANALYSIS:
- Urgency Level: ${analysis.urgency}
- Category: ${analysis.category}
- Keywords: ${analysis.keywords?.join(', ')}

PATIENT QUESTION: "${query}"

Please provide a helpful, accurate response that:
1. Addresses the patient's specific question
2. Considers their medical history and current medications
3. References their recent health data when relevant
4. Provides clear, actionable advice
5. Includes appropriate disclaimers about seeking professional medical care
6. Highlights any red flags or concerning symptoms
7. Suggests follow-up questions if appropriate

${analysis.urgency === 'emergency' ? 'IMPORTANT: This appears to be an emergency situation. Emphasize the need for immediate medical attention.' : ''}

Format your response as JSON with the following structure:
{
  "content": "Main response text",
  "confidence": 0.85,
  "sources": ["relevant medical sources"],
  "disclaimers": ["important disclaimers"],
  "recommendedActions": ["specific actions to take"],
  "redFlags": ["warning signs to watch for"],
  "followUpQuestions": ["suggested follow-up questions"]
}`;
  }

  async getAIResponse(prompt) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a knowledgeable health assistant. Provide accurate, helpful health information while always emphasizing the importance of professional medical care for serious concerns. Always respond in valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const content = response.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          content: content,
          confidence: 0.7,
          sources: [],
          disclaimers: ["Please consult with a healthcare professional for personalized medical advice."],
          recommendedActions: [],
          redFlags: [],
          followUpQuestions: []
        };
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to get AI response');
    }
  }

  processAIResponse(aiResponse, analysis) {
    // Add standard disclaimers
    const standardDisclaimers = [
      "This information is for educational purposes only and should not replace professional medical advice.",
      "Always consult with your healthcare provider before making changes to your treatment plan.",
      "If you're experiencing a medical emergency, call emergency services immediately."
    ];

    // Merge with AI-generated disclaimers
    const allDisclaimers = [...new Set([...standardDisclaimers, ...(aiResponse.disclaimers || [])])];

    // Add urgency-specific recommendations
    if (analysis.urgency === 'emergency') {
      aiResponse.recommendedActions = [
        "Seek immediate medical attention or call emergency services",
        ...(aiResponse.recommendedActions || [])
      ];
    } else if (analysis.urgency === 'high') {
      aiResponse.recommendedActions = [
        "Contact your healthcare provider as soon as possible",
        ...(aiResponse.recommendedActions || [])
      ];
    }

    return {
      ...aiResponse,
      disclaimers: allDisclaimers,
      urgencyLevel: analysis.urgency,
      category: analysis.category
    };
  }

  async generateHealthSummary(userId, period = 7) {
    try {
      const healthContext = await this.gatherHealthContext(userId);
      
      const prompt = `Based on the following health data, generate a comprehensive health summary:

${JSON.stringify(healthContext, null, 2)}

Please provide a ${period}-day health summary that includes:
1. Overall health status
2. Key trends in vital signs
3. Medication adherence assessment
4. Areas of concern
5. Positive health indicators
6. Recommendations for improvement

Format as JSON with sections for each area.`;

      const response = await this.getAIResponse(prompt);
      return response;
    } catch (error) {
      console.error('Health summary generation error:', error);
      throw new Error('Failed to generate health summary');
    }
  }
}

module.exports = AIHealthAssistant;
