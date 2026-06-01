const MedicalRecord = require('../models/MedicalRecord');
const User = require('../models/User');
const qrcode = require('qrcode');
const crypto = require('crypto');

exports.getProfileForm = async (req, res) => {
  try {
    const record = await MedicalRecord.findOne({ user: req.user.id });
    res.render('pages/profile', { record });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server error loading profile form');
    res.redirect('/dashboard');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { 
      fullName, bloodGroup, dateOfBirth, gender, height, weight, phone,
      allergies, currentMedications, existingDiseases
    } = req.body;

    // Parse up to 3 emergency contacts from arrays
    const names     = [].concat(req.body['contactName[]']  || req.body.contactName  || []);
    const relations = [].concat(req.body['contactRelation[]'] || req.body.contactRelation || []);
    const phones    = [].concat(req.body['contactPhone[]'] || req.body.contactPhone || []);

    const emergencyContacts = [];
    for (let i = 0; i < Math.min(names.length, 3); i++) {
      const n = (names[i] || '').trim();
      const r = (relations[i] || '').trim();
      const p = (phones[i] || '').trim();
      if (n && r && p) {
        emergencyContacts.push({ name: n, relationship: r, phoneNumber: p });
      }
    }

    const recordData = {
      user: req.user.id,
      fullName,
      bloodGroup,
      dateOfBirth,
      gender,
      height,
      weight,
      phone: phone ? phone.trim() : '',
      allergies: allergies ? allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
      currentMedications: currentMedications ? currentMedications.split(',').map(s => s.trim()).filter(Boolean) : [],
      existingDiseases: existingDiseases ? existingDiseases.split(',').map(s => s.trim()).filter(Boolean) : [],
      emergencyContacts
    };

    let record = await MedicalRecord.findOne({ user: req.user.id });
    if (record) {
      // Update existing record
      record = await MedicalRecord.findOneAndUpdate(
        { user: req.user.id },
        { $set: recordData },
        { new: true }
      );
    } else {
      // Create new record
      record = new MedicalRecord(recordData);
      await record.save();
      // Link record to user
      await User.findByIdAndUpdate(req.user.id, { medicalRecord: record._id });
    }

    // --- QR Code Generation ---
    // If the user doesn't have a QR code ID yet, generate one now.
    const user = await User.findById(req.user.id);
    if (!user.qrCodeId) {
      const qrCodeId = crypto.randomUUID(); // Secure unique identifier
      const emergencyUrl = `${req.protocol}://${req.get('host')}/emergency/${qrCodeId}`;
      const qrCodeImage = await qrcode.toDataURL(emergencyUrl); // Generates Base64 image
      
      user.qrCodeId = qrCodeId;
      user.qrCodeImage = qrCodeImage;
      await user.save();
    }

    req.flash('success_msg', 'Medical profile saved successfully!');
    res.redirect('/profile/view');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred while saving the profile');
    res.redirect('/profile/edit');
  }
};

exports.viewProfile = async (req, res) => {
  try {
    const record = await MedicalRecord.findOne({ user: req.user.id });
    if (!record) {
      req.flash('error_msg', 'Please complete your medical profile first');
      return res.redirect('/profile/edit');
    }
    res.render('pages/profile-view', { record });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server error loading profile');
    res.redirect('/dashboard');
  }
};
