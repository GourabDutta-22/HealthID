const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../middlewares/auth');

// Welcome Page
router.get('/', forwardAuthenticated, (req, res) => res.render('pages/home'));

router.get('/terms', (req, res) => {
  res.render('pages/terms');
});

router.get('/privacy', (req, res) => {
  res.render('pages/privacy');
});

router.get('/about', (req, res) => {
  res.render('pages/about');
});

// Dashboard
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render('pages/dashboard', {
    user: req.user
  });
});

module.exports = router;
