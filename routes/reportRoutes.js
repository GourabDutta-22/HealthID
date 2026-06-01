const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { ensureAuthenticated } = require('../middlewares/auth');
const { upload } = require('../config/cloudinary');

router.get('/', ensureAuthenticated, reportController.getReports);
// upload.single is handled in app.js before CSRF
router.post('/upload', ensureAuthenticated, reportController.uploadReport);
router.post('/delete/:reportId', ensureAuthenticated, reportController.deleteReport);
router.post('/analyze/:reportId', ensureAuthenticated, reportController.analyzeReport);

module.exports = router;
