const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { ensureAuthenticated } = require('../middlewares/auth');
const { upload } = require('../config/cloudinary');

router.get('/', ensureAuthenticated, reportController.getReports);
// upload.single('reportFile') intercepts the form data and uploads to cloudinary
router.post('/upload', ensureAuthenticated, upload.single('reportFile'), reportController.uploadReport);
router.post('/delete/:reportId', ensureAuthenticated, reportController.deleteReport);
router.post('/analyze/:reportId', ensureAuthenticated, reportController.analyzeReport);

module.exports = router;
