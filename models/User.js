const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: String,
  lastName: String,
  dateOfBirth: Date,
  bloodGroup: String,
  profilePicture: String,
  qrCodeId: { type: String, unique: true, sparse: true },
  qrCodeImage: String,
  medicalRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
