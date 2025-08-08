const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const auth = require('../middleware/auth');

// Configure multer for medical document uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/medical-documents');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `medical-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for medical documents
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, Images, Word documents, Text files'));
    }
  }
});

router.use(auth);

// Upload medical documents
router.post('/upload', upload.array('documents', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No files uploaded' 
      });
    }

    const { category, description, date, isPrivate = false } = req.body;

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadPath: file.path,
      category: category || 'general',
      description: description || '',
      uploadDate: date ? new Date(date) : new Date(),
      isPrivate: isPrivate === 'true',
      uploadedBy: req.user.id
    }));

    // Save file metadata to user's medical documents
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        'medicalDocuments': { $each: uploadedFiles }
      }
    });

    res.status(201).json({
      success: true,
      data: {
        uploadedFiles: uploadedFiles.length,
        files: uploadedFiles.map(file => ({
          filename: file.originalName,
          category: file.category,
          uploadDate: file.uploadDate
        }))
      }
    });

  } catch (error) {
    console.error('Error uploading medical documents:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload documents' 
    });
  }
});

// Get user's medical documents
router.get('/documents', async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;

    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('medicalDocuments');

    let documents = user.medicalDocuments || [];

    // Filter by category if specified
    if (category) {
      documents = documents.filter(doc => doc.category === category);
    }

    // Sort by upload date (newest first)
    documents.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    // Paginate
    const startIndex = (page - 1) * limit;
    const paginatedDocuments = documents.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      data: {
        documents: paginatedDocuments.map(doc => ({
          id: doc._id,
          originalName: doc.originalName,
          category: doc.category,
          description: doc.description,
          uploadDate: doc.uploadDate,
          size: doc.size,
          mimetype: doc.mimetype,
          isPrivate: doc.isPrivate
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: documents.length,
          pages: Math.ceil(documents.length / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching medical documents:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch documents' 
    });
  }
});

// Download medical document
router.get('/documents/:documentId/download', async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id);

    const document = user.medicalDocuments.id(req.params.documentId);
    if (!document) {
      return res.status(404).json({ 
        success: false, 
        error: 'Document not found' 
      });
    }

    // Check if file exists
    try {
      await fs.access(document.uploadPath);
    } catch (error) {
      return res.status(404).json({ 
        success: false, 
        error: 'File not found on server' 
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.mimetype);
    res.sendFile(path.resolve(document.uploadPath));

  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to download document' 
    });
  }
});

// Delete medical document
router.delete('/documents/:documentId', async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id);

    const document = user.medicalDocuments.id(req.params.documentId);
    if (!document) {
      return res.status(404).json({ 
        success: false, 
        error: 'Document not found' 
      });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(document.uploadPath);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Continue even if file deletion fails
    }

    // Remove from user's documents
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { medicalDocuments: { _id: req.params.documentId } }
    });

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete document' 
    });
  }
});

// Update medical profile/information
router.put('/profile', async (req, res) => {
  try {
    const {
      allergies,
      medicalConditions,
      emergencyContact,
      bloodType,
      height,
      weight,
      insuranceInfo,
      primaryDoctor
    } = req.body;

    const User = require('../models/User');
    const updateData = {};

    if (allergies !== undefined) updateData['medicalInfo.allergies'] = allergies;
    if (medicalConditions !== undefined) updateData['medicalInfo.conditions'] = medicalConditions;
    if (emergencyContact !== undefined) updateData['medicalInfo.emergencyContact'] = emergencyContact;
    if (bloodType !== undefined) updateData['medicalInfo.bloodType'] = bloodType;
    if (height !== undefined) updateData['medicalInfo.height'] = height;
    if (weight !== undefined) updateData['medicalInfo.weight'] = weight;
    if (insuranceInfo !== undefined) updateData['medicalInfo.insurance'] = insuranceInfo;
    if (primaryDoctor !== undefined) updateData['medicalInfo.primaryDoctor'] = primaryDoctor;

    updateData['medicalInfo.lastUpdated'] = new Date();

    await User.findByIdAndUpdate(req.user.id, { $set: updateData });

    res.json({
      success: true,
      message: 'Medical profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating medical profile:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update medical profile' 
    });
  }
});

// Get medical profile
router.get('/profile', async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('medicalInfo');

    res.json({
      success: true,
      data: user.medicalInfo || {
        allergies: [],
        conditions: [],
        emergencyContact: {},
        bloodType: '',
        height: null,
        weight: null,
        insurance: {},
        primaryDoctor: {}
      }
    });

  } catch (error) {
    console.error('Error fetching medical profile:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch medical profile' 
    });
  }
});

// Share medical information with family member
router.post('/share/:familyMemberId', async (req, res) => {
  try {
    const { documentIds, includeProfile = false, message } = req.body;
    const { familyMemberId } = req.params;

    const User = require('../models/User');
    const Family = require('../models/Family');
    
    // Verify family relationship
    const user = await User.findById(req.user.id).populate('familyId');
    if (!user.familyId) {
      return res.status(400).json({ 
        success: false, 
        error: 'No family group found' 
      });
    }

    const family = await Family.findById(user.familyId);
    const isFamilyMember = family.members.some(member => 
      member.user.toString() === familyMemberId
    );

    if (!isFamilyMember) {
      return res.status(403).json({ 
        success: false, 
        error: 'Can only share with family members' 
      });
    }

    // Create sharing record
    const shareData = {
      sharedBy: req.user.id,
      sharedWith: familyMemberId,
      sharedAt: new Date(),
      documentIds: documentIds || [],
      includeProfile,
      message: message || '',
      accessLevel: 'view' // Could be extended to include edit permissions
    };

    // In a real implementation, you'd save this to a separate collection
    // For now, we'll just send a notification
    const NotificationService = require('../services/notificationService');
    const notificationService = new NotificationService(req.io);

    const sharedByUser = await User.findById(req.user.id);
    await notificationService.sendToUser(familyMemberId, {
      title: 'Medical Information Shared',
      body: `${sharedByUser.firstName} shared medical information with you`,
      data: {
        type: 'medical_share',
        sharedBy: req.user.id,
        documentCount: documentIds?.length || 0,
        includeProfile
      }
    });

    res.json({
      success: true,
      message: 'Medical information shared successfully'
    });

  } catch (error) {
    console.error('Error sharing medical information:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to share medical information' 
    });
  }
});

// Get document categories
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { value: 'lab_results', label: 'Lab Results' },
      { value: 'prescriptions', label: 'Prescriptions' },
      { value: 'imaging', label: 'Medical Imaging' },
      { value: 'reports', label: 'Medical Reports' },
      { value: 'insurance', label: 'Insurance Documents' },
      { value: 'vaccination', label: 'Vaccination Records' },
      { value: 'discharge', label: 'Discharge Summaries' },
      { value: 'referrals', label: 'Referrals' },
      { value: 'other', label: 'Other' }
    ];

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch categories' 
    });
  }
});

module.exports = router;
