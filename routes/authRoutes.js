const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { forwardAuthenticated } = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per window
  message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

// Register
router.get('/register', forwardAuthenticated, authController.getRegister);
router.post('/register', forwardAuthenticated, authController.postRegister);

router.get('/login', forwardAuthenticated, authController.getLogin);
router.post('/login', loginLimiter, authController.postLogin);
router.post('/login-pin', loginLimiter, authController.postLoginPin);

// Logout
router.get('/logout', authController.logout);

module.exports = router;
