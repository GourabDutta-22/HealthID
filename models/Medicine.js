const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, lowercase: true, trim: true },
  drugClass: { type: String, required: true, lowercase: true, trim: true },
  allergyCategory: { type: String, required: true, lowercase: true, trim: true },
  composition: { type: [String], default: [] } // Array of active ingredients
});

module.exports = mongoose.model('Medicine', medicineSchema);
