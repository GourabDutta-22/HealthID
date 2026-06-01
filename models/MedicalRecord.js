const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true },
  bloodGroup: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, required: true, enum: ['Male', 'Female', 'Other', 'Prefer not to say'] },
  height: { type: Number, required: true }, // in cm
  weight: { type: Number, required: true }, // in kg
  phone: { type: String, default: '' }, // user's own contact number
  allergies: { type: [String], default: [] },
  currentMedications: { type: [String], default: [] },
  existingDiseases: { type: [String], default: [] },
  emergencyContacts: [{
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phoneNumber: { type: String, required: true }
  }],
  reports: [{
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
    cloudinaryId: { type: String, required: true },
    fileType: { type: String },
    aiSummary: { type: String, default: null },
    uploadedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
