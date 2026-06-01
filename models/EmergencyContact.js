const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  medicalRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord', required: true },
  name: { type: String, required: true },
  relationship: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: String
}, { timestamps: true });

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
