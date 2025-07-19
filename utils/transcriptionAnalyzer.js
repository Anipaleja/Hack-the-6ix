/**
 * Transcription Analysis Utility
 * Analyzes transcribed text for health-related keywords and entities
 */

class TranscriptionAnalyzer {
  constructor() {
    // Medical keyword dictionaries
    this.keywords = {
      symptoms: [
        'headache', 'pain', 'ache', 'hurt', 'sore', 'nausea', 'dizzy', 'tired', 'fatigue',
        'fever', 'cough', 'sneeze', 'itch', 'rash', 'swelling', 'bloated', 'cramping',
        'stiff', 'weak', 'numb', 'tingling', 'burning', 'throbbing', 'sharp', 'dull'
      ],
      emotions: [
        'anxious', 'stressed', 'worried', 'depressed', 'sad', 'happy', 'calm', 'angry',
        'frustrated', 'overwhelmed', 'peaceful', 'energetic', 'moody', 'irritated'
      ],
      bodyParts: [
        'head', 'neck', 'shoulder', 'arm', 'hand', 'chest', 'back', 'stomach', 'abdomen',
        'hip', 'leg', 'knee', 'ankle', 'foot', 'eye', 'ear', 'throat', 'heart', 'lung'
      ],
      medications: [
        'ibuprofen', 'tylenol', 'aspirin', 'advil', 'aleve', 'prescription', 'pill', 'tablet',
        'medication', 'medicine', 'dose', 'dosage', 'antibiotic', 'vitamin', 'supplement'
      ],
      severity: [
        'mild', 'moderate', 'severe', 'terrible', 'awful', 'excruciating', 'unbearable',
        'slight', 'minor', 'major', 'worse', 'better', 'improving', 'worsening'
      ],
      time: [
        'morning', 'afternoon', 'evening', 'night', 'yesterday', 'today', 'tomorrow',
        'hours', 'minutes', 'days', 'weeks', 'since', 'after', 'before', 'during'
      ],
      activities: [
        'eating', 'sleeping', 'walking', 'running', 'exercise', 'work', 'driving',
        'sitting', 'standing', 'lying down', 'shower', 'meal', 'breakfast', 'lunch', 'dinner'
      ]
    };

    // Severity scale words
    this.severityScale = {
      1: ['tiny', 'barely', 'slight'],
      2: ['minor', 'little', 'small'],
      3: ['mild', 'light'],
      4: ['noticeable', 'moderate'],
      5: ['medium', 'average'],
      6: ['significant', 'considerable'],
      7: ['strong', 'intense'],
      8: ['severe', 'bad'],
      9: ['terrible', 'awful', 'horrible'],
      10: ['unbearable', 'excruciating', 'worst']
    };

    // Mood mapping
    this.moodMapping = {
      excellent: ['great', 'amazing', 'wonderful', 'fantastic', 'excellent', 'perfect'],
      good: ['good', 'fine', 'okay', 'well', 'better', 'nice', 'positive'],
      fair: ['okay', 'alright', 'so-so', 'average', 'neutral', 'fair'],
      poor: ['bad', 'not good', 'worse', 'difficult', 'struggling', 'poor'],
      terrible: ['terrible', 'awful', 'horrible', 'worst', 'miserable', 'dreadful']
    };
  }

  /**
   * Main analysis function
   * @param {string} transcription - The transcribed text
   * @returns {object} Analysis results
   */
  analyze(transcription) {
    const text = transcription.toLowerCase();
    const words = text.split(/\s+/);
    
    const analysis = {
      detectedKeywords: this.detectKeywords(text, words),
      medicalEntities: this.extractMedicalEntities(text),
      symptoms: this.extractSymptoms(text),
      severity: this.detectSeverity(text),
      mood: this.detectMood(text),
      timeContext: this.extractTimeContext(text),
      tags: this.generateTags(text)
    };

    return analysis;
  }

  /**
   * Detect keywords and their categories
   */
  detectKeywords(text, words) {
    const detected = [];
    
    Object.keys(this.keywords).forEach(category => {
      this.keywords[category].forEach(keyword => {
        const position = text.indexOf(keyword.toLowerCase());
        if (position !== -1) {
          // Map category names properly
          let categoryName = category;
          if (category === 'symptoms') categoryName = 'symptom';
          else if (category === 'emotions') categoryName = 'emotion';
          else if (category === 'bodyParts') categoryName = 'body_part';
          else if (category === 'medications') categoryName = 'medication';
          else if (category === 'severity') categoryName = 'severity';
          else if (category === 'time') categoryName = 'time';
          else if (category === 'activities') categoryName = 'activity';
          
          detected.push({
            word: keyword,
            category: categoryName,
            confidence: this.calculateKeywordConfidence(keyword, text),
            position
          });
        }
      });
    });

    return detected.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract medical entities
   */
  extractMedicalEntities(text) {
    const entities = [];
    
    // Look for dosage patterns like "10mg", "2 pills", "twice a day"
    const dosagePattern = /(\d+)\s*(mg|ml|pills?|tablets?|capsules?)/gi;
    let match;
    while ((match = dosagePattern.exec(text)) !== null) {
      entities.push({
        entity: match[0],
        type: 'dosage',
        confidence: 0.9
      });
    }

    // Look for frequency patterns
    const frequencyPattern = /(once|twice|three times|daily|weekly|hourly|every \d+ hours?)/gi;
    while ((match = frequencyPattern.exec(text)) !== null) {
      entities.push({
        entity: match[0],
        type: 'frequency',
        confidence: 0.8
      });
    }

    return entities;
  }

  /**
   * Extract symptoms from text
   */
  extractSymptoms(text) {
    const symptoms = [];
    
    this.keywords.symptoms.forEach(symptom => {
      if (text.includes(symptom)) {
        symptoms.push(symptom);
      }
    });

    return [...new Set(symptoms)]; // Remove duplicates
  }

  /**
   * Detect severity level (1-10)
   */
  detectSeverity(text) {
    for (let level = 10; level >= 1; level--) {
      const words = this.severityScale[level] || [];
      for (let word of words) {
        if (text.includes(word)) {
          return level;
        }
      }
    }

    // Look for numeric severity mentions
    const numericMatch = text.match(/(\d+)\s*(?:out of 10|\/10|scale)/);
    if (numericMatch) {
      return parseInt(numericMatch[1]);
    }

    return null;
  }

  /**
   * Detect mood from text
   */
  detectMood(text) {
    for (let mood in this.moodMapping) {
      for (let word of this.moodMapping[mood]) {
        if (text.includes(word)) {
          return mood;
        }
      }
    }
    return null;
  }

  /**
   * Extract time context
   */
  extractTimeContext(text) {
    const context = {
      when: null,
      duration: null,
      frequency: null
    };

    // Time of day
    const timePatterns = {
      morning: /morning|am|breakfast/i,
      afternoon: /afternoon|lunch|noon/i,
      evening: /evening|dinner|pm/i,
      night: /night|bedtime|sleep/i
    };

    for (let time in timePatterns) {
      if (timePatterns[time].test(text)) {
        context.when = time;
        break;
      }
    }

    // Duration patterns
    const durationMatch = text.match(/(\d+)\s*(hours?|minutes?|days?|weeks?)/i);
    if (durationMatch) {
      context.duration = durationMatch[0];
    }

    // Frequency patterns
    const frequencyMatch = text.match(/(daily|weekly|occasionally|sometimes|always|never|first time)/i);
    if (frequencyMatch) {
      context.frequency = frequencyMatch[0];
    }

    return context;
  }

  /**
   * Generate relevant tags
   */
  generateTags(text) {
    const tags = [];

    // Time-based tags
    if (/morning|am|breakfast/i.test(text)) tags.push('morning');
    if (/evening|night|dinner|pm/i.test(text)) tags.push('evening');
    
    // Activity-based tags
    if (/work|office|job/i.test(text)) tags.push('work-related');
    if (/exercise|gym|running|walking/i.test(text)) tags.push('exercise');
    if (/eat|food|meal|hungry/i.test(text)) tags.push('diet');
    if (/sleep|tired|bed/i.test(text)) tags.push('sleep');
    if (/stress|anxiety|worry/i.test(text)) tags.push('mental-health');
    if (/weather|cold|hot|rain/i.test(text)) tags.push('weather-related');
    if (/medication|medicine|pill/i.test(text)) tags.push('medication');

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Calculate confidence score for keyword detection
   */
  calculateKeywordConfidence(keyword, text) {
    // Simple confidence calculation based on context
    let confidence = 0.7; // Base confidence

    // Increase confidence if keyword appears multiple times
    const occurrences = (text.match(new RegExp(keyword, 'gi')) || []).length;
    confidence += Math.min(occurrences * 0.1, 0.2);

    // Increase confidence if keyword is surrounded by related words
    const contextWords = text.split(' ');
    const keywordIndex = contextWords.findIndex(word => word.includes(keyword));
    
    if (keywordIndex > 0 && keywordIndex < contextWords.length - 1) {
      // Check surrounding words for medical context
      const before = contextWords[keywordIndex - 1];
      const after = contextWords[keywordIndex + 1];
      
      if (/feel|have|experiencing|suffering/i.test(before) || 
          /pain|ache|problem/i.test(after)) {
        confidence += 0.2;
      }
    }

    return Math.min(confidence, 1.0);
  }
}

module.exports = TranscriptionAnalyzer;
