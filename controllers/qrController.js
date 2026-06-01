const User = require('../models/User');

exports.getEmergencyProfile = async (req, res) => {
  try {
    const { qrCodeId } = req.params;
    
    // Find user by unique qrCodeId and populate their medical record
    const user = await User.findOne({ qrCodeId }).populate('medicalRecord');
    
    if (!user || !user.medicalRecord) {
      return res.status(404).send('Emergency profile not found or invalid QR code link.');
    }

    res.render('pages/emergency', { 
      record: user.medicalRecord,
      qrCodeId: user.qrCodeId,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error retrieving emergency profile.');
  }
};
