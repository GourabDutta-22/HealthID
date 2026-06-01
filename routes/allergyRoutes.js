const express = require('express');
const router = express.Router();
const allergyController = require('../controllers/allergyController');
const { ensureAuthenticated } = require('../middlewares/auth');

router.get('/', ensureAuthenticated, allergyController.getCheckerPage);
router.post('/check', ensureAuthenticated, allergyController.checkAllergyAPI);

module.exports = router;
