const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../middlewares/auth');

// Welcome Page
router.get('/', forwardAuthenticated, (req, res) => res.render('pages/home'));

// Dashboard
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render('pages/dashboard', {
    user: req.user
  });
});

module.exports = router;
