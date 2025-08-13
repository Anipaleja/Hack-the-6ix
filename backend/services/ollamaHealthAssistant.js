const { Ollama } = require('ollama');
const HealthData = require('../models/HealthData');
const Medication = require('../models/Medication');
const User = require('../models/User');

class OllamaHealthAssistant {
  constructor() {
    this.ollama = new Ollama({ 
      host: 'http://localhost:11434' 
    });
    this.model = 'llama3.2:3b';
    
    // Healthcare-specific knowledge base
    this.healthcareKnowledge = {
      medications: {
        common_interactions: {
          'warfarin': ['aspirin', 'ibuprofen', 'alcohol'],
          'metformin': ['alcohol', 'contrast_dye'],
          'lisinopril': ['potassium_supplements', 'nsaids'],
          'atorvastatin': ['grapefruit', 'clarithromycin']
        },
        side_effects: {
          'aspirin': ['stomach_upset', 'bleeding', 'ringing_in_ears'],
          'metformin': ['nausea', 'diarrhea', 'metallic_taste'],
          'lisinopril': ['dry_cough', 'dizziness', 'hyperkalemia'],
          'atorvastatin': ['muscle_pain', 'liver_issues', 'memory_problems']
        }
      },
      symptoms: {
        emergency: ['chest_pain', 'difficulty_breathing', 'severe_headache', 'loss_of_consciousness'],
        urgent: ['high_fever', 'severe_pain', 'persistent_vomiting', 'signs_of_infection'],
        routine: ['mild_headache', 'fatigue', 'minor_aches', 'seasonal_allergies']
      }
    };
  }

  async processHealthQuery(query, user, context = {}) {
    try {
      const startTime = Date.now();
      
      // Gather user's health context
      const healthContext = await this.gatherHealthContext(user._id, context);
      
      // Analyze query urgency and category
      const queryAnalysis = this.analyzeQuery(query);
      
      // Build specialized healthcare prompt
      const prompt = this.buildHealthcarePrompt(query, healthContext, queryAnalysis);
      
      // Get AI response from Ollama
      const aiResponse = await this.getOllamaResponse(prompt);
      
      // Post-process response with healthcare safety checks
      const processedResponse = this.processHealthResponse(aiResponse, queryAnalysis);
      
      const processingTime = Date.now() - startTime;
      
      return {
        response: processedResponse,
        context: healthContext,
        analysis: queryAnalysis,
        processingTime,
        model: this.model,
        confidence: this.calculateConfidence(query, aiResponse)
      };
    } catch (error) {
      console.error('Ollama Health Assistant error:', error);
      return this.getFallbackResponse(query);
    }
  }

  async gatherHealthContext(userId, additionalContext = {}) {
    try {
      // Get user's basic info and medical history
      const user = await User.findById(userId).select('medicalInfo dateOfBirth firstName');
      
      // Get recent medications
      const medications = await Medication.find({ 
        patient: userId, 
        isActive: true 
      }).select('commonName scientificName dosage category sideEffects').limit(10);
      
      // Get recent health data
      const healthData = await HealthData.find({ 
        user: userId 
      }).sort({ timestamp: -1 }).limit(5);
      
      return {
        user: {
          age: user?.dateOfBirth ? this.calculateAge(user.dateOfBirth) : null,
          firstName: user?.firstName || 'User',
          conditions: user?.medicalInfo?.conditions || [],
          allergies: user?.medicalInfo?.allergies || []
        },
        medications: medications.map(med => ({
          name: med.commonName,
          scientific: med.scientificName,
          dosage: med.dosage,
          category: med.category,
          sideEffects: med.sideEffects
        })),
        recentVitals: healthData.map(data => ({
          type: data.type,
          value: data.value,
          date: data.timestamp
        })),
        ...additionalContext
      };
    } catch (error) {
      console.error('Error gathering health context:', error);
      return { user: {}, medications: [], recentVitals: [] };
    }
  }

  analyzeQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    // Check for emergency keywords
    const emergencyKeywords = ['chest pain', 'can\'t breathe', 'difficulty breathing', 'severe pain', 'emergency', 'urgent', 'heart attack', 'stroke'];
    const isEmergency = emergencyKeywords.some(keyword => lowerQuery.includes(keyword));
    
    // Check for medication-related queries
    const isMedicationQuery = lowerQuery.includes('medication') || lowerQuery.includes('drug') || lowerQuery.includes('pill') || lowerQuery.includes('dose');
    
    // Check for symptom queries
    const isSymptomQuery = lowerQuery.includes('symptom') || lowerQuery.includes('feel') || lowerQuery.includes('pain') || lowerQuery.includes('sick');
    
    // Check for interaction queries
    const isInteractionQuery = lowerQuery.includes('interaction') || lowerQuery.includes('together') || lowerQuery.includes('combine');
    
    return {
      urgency: isEmergency ? 'emergency' : 'routine',
      category: isMedicationQuery ? 'medication' : isSymptomQuery ? 'symptom' : isInteractionQuery ? 'interaction' : 'general',
      requiresDisclaimer: true,
      keywords: this.extractKeywords(query)
    };
  }

  buildHealthcarePrompt(query, healthContext, analysis) {
    // Safely extract user information with defaults
    const user = healthContext.user || {};
    const medications = healthContext.medications || [];
    const conditions = user.conditions || user.medicalInfo?.conditions || [];
    const allergies = user.allergies || user.medicalInfo?.allergies || [];
    
    const systemPrompt = `You are Vivirion Health Assistant, a specialized AI healthcare companion. You provide helpful, accurate health information while emphasizing safety.

IMPORTANT GUIDELINES:
- Always include medical disclaimers
- Never diagnose medical conditions
- Recommend consulting healthcare professionals for serious concerns
- Be empathetic and supportive
- Use the user's health context when relevant
- Focus on medication management, wellness tips, and general health education

USER CONTEXT:
Name: ${user.firstName || 'User'}
Age: ${user.age || 'Not specified'}
Current Medications: ${medications.length > 0 ? medications.map(m => `${m.name} (${m.dosage?.amount || ''}${m.dosage?.unit || ''})`).join(', ') : 'None listed'}
Medical Conditions: ${Array.isArray(conditions) && conditions.length > 0 ? conditions.join(', ') : 'None listed'}
Allergies: ${Array.isArray(allergies) && allergies.length > 0 ? allergies.join(', ') : 'None listed'}

QUERY ANALYSIS:
Category: ${analysis.category}
Urgency: ${analysis.urgency}
Keywords: ${Array.isArray(analysis.keywords) ? analysis.keywords.join(', ') : 'None'}`;

    if (analysis.urgency === 'emergency') {
      return `${systemPrompt}

⚠️ EMERGENCY DETECTED ⚠️
This appears to be a medical emergency. Please respond with:
1. Immediate advice to seek emergency medical care
2. Emergency contact numbers
3. Basic first aid if applicable
4. Reassurance while waiting for help

USER QUERY: "${query}"

Respond with urgency and clarity.`;
    }

    return `${systemPrompt}

USER QUERY: "${query}"

Please provide a helpful, informative response that:
1. Addresses the user's question
2. Uses their health context when relevant
3. Includes appropriate medical disclaimers
4. Suggests when to consult healthcare providers
5. Offers practical advice when appropriate`;
  }

  async getOllamaResponse(prompt) {
    try {
      const response = await this.ollama.chat({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 1000
        }
      });
      
      return response.message.content;
    } catch (error) {
      console.error('Ollama API error:', error);
      throw new Error('Failed to get AI response');
    }
  }

  processHealthResponse(aiResponse, analysis) {
    let processedResponse = aiResponse;
    
    // Add emergency warning if needed
    if (analysis.urgency === 'emergency') {
      processedResponse = `🚨 **MEDICAL EMERGENCY** 🚨\n\n${processedResponse}\n\n**If this is a life-threatening emergency, call 911 immediately.**`;
    }
    
    // Add medication interaction warnings
    if (analysis.category === 'medication' || analysis.category === 'interaction') {
      processedResponse += `\n\n⚠️ **Important**: Always consult your pharmacist or doctor before starting, stopping, or combining medications.`;
    }
    
    // Add general medical disclaimer
    processedResponse += `\n\n📋 **Medical Disclaimer**: This information is for educational purposes only and should not replace professional medical advice. Always consult with your healthcare provider for medical concerns.`;
    
    return processedResponse;
  }

  calculateConfidence(query, response) {
    // Simple confidence calculation based on response length and keyword matching
    const queryWords = query.toLowerCase().split(' ');
    const responseWords = response.toLowerCase().split(' ');
    
    const matchingWords = queryWords.filter(word => 
      responseWords.some(respWord => respWord.includes(word) || word.includes(respWord))
    );
    
    const confidence = Math.min(0.95, Math.max(0.3, matchingWords.length / queryWords.length));
    return Math.round(confidence * 100);
  }

  getFallbackResponse(query) {
    return {
      response: `I apologize, but I'm experiencing technical difficulties processing your health query. Please try again in a moment, or consult with your healthcare provider for immediate assistance.

📋 **Medical Disclaimer**: For any urgent health concerns, please contact your doctor or call emergency services.`,
      context: {},
      analysis: { urgency: 'routine', category: 'general' },
      processingTime: 0,
      model: 'fallback',
      confidence: 0
    };
  }

  extractKeywords(query) {
    const medicalKeywords = [
      'pain', 'medication', 'dose', 'side effect', 'symptom', 'fever', 'headache',
      'nausea', 'dizziness', 'fatigue', 'sleep', 'appetite', 'weight', 'blood pressure',
      'diabetes', 'heart', 'stomach', 'interaction', 'allergy', 'prescription'
    ];
    
    const words = query.toLowerCase().split(' ');
    return words.filter(word => medicalKeywords.includes(word));
  }

  calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  // Method to fine-tune the model with healthcare data
  async trainWithHealthcareData() {
    const trainingData = [
      {
        prompt: "What should I do if I miss a dose of my medication?",
        response: "If you miss a dose of your medication:\n\n1. **Take it as soon as you remember** - unless it's almost time for your next dose\n2. **Don't double dose** - never take two doses at once to make up for a missed dose\n3. **Check medication-specific instructions** - some medications have specific guidelines\n4. **Set reminders** - use phone alarms or pill organizers to prevent future missed doses\n\n⚠️ **Important**: Contact your pharmacist or doctor if you frequently miss doses or have questions about your specific medication.\n\n📋 **Medical Disclaimer**: This is general advice. Always follow your healthcare provider's specific instructions for your medications."
      },
      {
        prompt: "Can I take ibuprofen with my blood pressure medication?",
        response: "⚠️ **Potential Drug Interaction Alert** ⚠️\n\nIbuprofen and other NSAIDs can interact with blood pressure medications (like ACE inhibitors, ARBs, or diuretics) by:\n\n• Reducing the effectiveness of blood pressure medications\n• Potentially causing kidney problems\n• Increasing blood pressure\n\n**Recommendations:**\n1. **Consult your pharmacist or doctor** before taking ibuprofen\n2. **Consider alternatives** like acetaminophen for pain relief\n3. **Monitor your blood pressure** if you must take NSAIDs\n4. **Use the lowest effective dose** for the shortest time possible\n\n📋 **Medical Disclaimer**: This information is for educational purposes. Always consult your healthcare provider before combining medications."
      }
    ];

    // Note: This is a placeholder for fine-tuning functionality
    // Ollama doesn't support fine-tuning directly, but we can use this data
    // to improve our prompt engineering and response quality
    console.log('Healthcare training data loaded for improved responses');
  }
}

module.exports = OllamaHealthAssistant;
