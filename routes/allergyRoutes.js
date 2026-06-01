const express = require('express');
const router = express.Router();
const allergyController = require('../controllers/allergyController');
const { ensureAuthenticated } = require('../middlewares/auth');

router.get('/', ensureAuthenticated, allergyController.getCheckerPage);
router.post('/check', ensureAuthenticated, allergyController.checkAllergyAPI);
router.post('/check-emergency/:qrCodeId', allergyController.checkEmergencyAllergy);

module.exports = router;
