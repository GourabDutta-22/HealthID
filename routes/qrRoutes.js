const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');

// Public Emergency Route (No authentication required)
router.get('/:qrCodeId', qrController.getEmergencyProfile);

module.exports = router;
