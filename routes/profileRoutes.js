const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { ensureAuthenticated } = require('../middlewares/auth');
const { upload } = require('../config/cloudinary');

// Profile routes (all protected)
router.get('/edit', ensureAuthenticated, profileController.getProfileForm);
router.post('/edit', ensureAuthenticated, profileController.updateProfile);
router.get('/view', ensureAuthenticated, profileController.viewProfile);
router.post('/set-pin', ensureAuthenticated, profileController.setPin);

module.exports = router;
