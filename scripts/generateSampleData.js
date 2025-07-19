const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const HealthLog = require('../models/HealthLog');
const TranscriptionAnalyzer = require('../utils/transcriptionAnalyzer');

// Initialize analyzer for processing sample data
const analyzer = new TranscriptionAnalyzer();

// Sample health log transcriptions for demo purposes
const sampleTranscriptions = [
  "I'm feeling pretty good today. Had a slight headache this morning but it's gone now. My energy levels are higher than yesterday.",
  "Woke up with some back pain, probably from sleeping wrong. It's a dull ache, about a 4 out of 10. Taking some ibuprofen.",
  "Had trouble sleeping last night, kept tossing and turning. Feeling tired and a bit anxious today. Mood is fair.",
  "Great day! Went for a run this morning and felt energized. No pain or discomfort. Mood is excellent.",
  "Stomach has been bothering me since lunch. Feels bloated and uncomfortable. Might be something I ate.",
  "Knee is acting up again, especially when walking up stairs. The arthritis seems worse in this cold weather.",
  "Feeling stressed about work deadlines. Having some tension in my shoulders and neck. Need to practice relaxation techniques.",
  "Allergies are hitting hard today. Sneezing, runny nose, and watery eyes. Spring pollen is terrible this year.",
  "Blood pressure felt high this morning, feeling a bit dizzy. Should probably check with my doctor soon.",
  "Had a panic attack earlier, heart was racing and felt short of breath. Lasted about 10 minutes. Feel better now but still shaken."
];

const sampleUsers = [
  {
    name: "John Doe",
    email: "john.doe@example.com",
    deviceIds: ["device_001"],
    profile: {
      age: 35,
      gender: "male",
      medicalConditions: [
        {
          condition: "Hypertension",
          diagnosedDate: new Date("2022-03-15"),
          severity: "mild"
        }
      ],
      allergies: ["pollen", "dust"],
      medications: [
        {
          name: "Lisinopril",
          dosage: "10mg",
          frequency: "once daily",
          startDate: new Date("2022-03-20")
        }
      ]
    }
  },
  {
    name: "Jane Smith",
    email: "jane.smith@example.com",
    deviceIds: ["device_002"],
    profile: {
      age: 28,
      gender: "female",
      medicalConditions: [
        {
          condition: "Anxiety Disorder",
          diagnosedDate: new Date("2021-08-10"),
          severity: "moderate"
        }
      ],
      allergies: ["shellfish"],
      medications: [
        {
          name: "Sertraline",
          dosage: "50mg",
          frequency: "once daily",
          startDate: new Date("2021-08-15")
        }
      ]
    }
  }
];

async function generateSampleData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await HealthLog.deleteMany({});

    // Create sample users
    console.log('Creating sample users...');
    const createdUsers = await User.insertMany(sampleUsers);
    console.log(`Created ${createdUsers.length} users`);

    // Generate sample health logs
    console.log('Generating sample health logs...');
    const healthLogs = [];
    
    for (let i = 0; i < 20; i++) {
      const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      const randomTranscription = sampleTranscriptions[Math.floor(Math.random() * sampleTranscriptions.length)];
      
      // Generate timestamps over the last 30 days
      const daysAgo = Math.floor(Math.random() * 30);
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - daysAgo);
      timestamp.setHours(Math.floor(Math.random() * 24));
      timestamp.setMinutes(Math.floor(Math.random() * 60));

      // Analyze the transcription for keywords and medical entities
      const analysis = analyzer.analyze(randomTranscription);

      const healthLog = {
        userId: randomUser._id,
        transcription: randomTranscription,
        timestamp,
        deviceId: randomUser.deviceIds[0],
        metadata: {
          duration: Math.floor(Math.random() * 60) + 15, // 15-75 seconds
          confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0 confidence
          language: 'en'
        },
        healthData: {
          symptoms: analysis.symptoms,
          severity: analysis.severity || Math.floor(Math.random() * 10) + 1,
          tags: analysis.tags,
          mood: analysis.mood || ['excellent', 'good', 'fair', 'poor', 'terrible'][Math.floor(Math.random() * 5)],
          detectedKeywords: analysis.detectedKeywords,
          medicalEntities: analysis.medicalEntities,
          timeContext: analysis.timeContext
        },
        processed: true, // Mark as processed since we analyzed it
        processedAt: new Date(timestamp.getTime() + Math.random() * 3600000) // Processed within an hour
      };

      healthLogs.push(healthLog);
    }

    const createdLogs = await HealthLog.insertMany(healthLogs);
    console.log(`Created ${createdLogs.length} health logs`);

    console.log('\nSample data generation complete!');
    console.log('\nUsers created:');
    createdUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email})`);
    });

    console.log(`\nGenerated ${createdLogs.length} health logs with various symptoms and moods`);
    console.log('\nYou can now test the API endpoints:');
    console.log('- GET /api/health to check server status');
    console.log('- GET /api/users to see all users');
    console.log('- GET /api/health-logs/user/:userId to see logs for a specific user');
    console.log(`- Example: GET /api/health-logs/user/${createdUsers[0]._id}`);

  } catch (error) {
    console.error('Error generating sample data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

function generateRandomSymptoms() {
  const allSymptoms = [
    'headache', 'back pain', 'fatigue', 'nausea', 'dizziness', 'anxiety',
    'joint pain', 'muscle ache', 'shortness of breath', 'chest pain',
    'stomach ache', 'insomnia', 'stress', 'allergies', 'fever'
  ];
  
  const numSymptoms = Math.floor(Math.random() * 3) + 1; // 1-3 symptoms
  const symptoms = [];
  
  for (let i = 0; i < numSymptoms; i++) {
    const symptom = allSymptoms[Math.floor(Math.random() * allSymptoms.length)];
    if (!symptoms.includes(symptom)) {
      symptoms.push(symptom);
    }
  }
  
  return symptoms;
}

function generateRandomTags() {
  const allTags = [
    'morning', 'evening', 'work-related', 'weather-related', 'medication',
    'exercise', 'sleep', 'diet', 'stress', 'chronic'
  ];
  
  const numTags = Math.floor(Math.random() * 3); // 0-2 tags
  const tags = [];
  
  for (let i = 0; i < numTags; i++) {
    const tag = allTags[Math.floor(Math.random() * allTags.length)];
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  
  return tags;
}

// Run the script
if (require.main === module) {
  generateSampleData();
}

module.exports = { generateSampleData };
