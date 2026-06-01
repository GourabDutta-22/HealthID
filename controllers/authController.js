const User = require('../models/User');
const bcrypt = require('bcrypt');
const passport = require('passport');

exports.getLogin = (req, res) => {
  res.render('pages/login', { savedEmail: req.cookies.saved_email });
};

exports.getRegister = (req, res) => {
  res.render('pages/register');
};

exports.postRegister = async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  let errors = [];

  // Basic Validation
  if (!username || !email || !password || !confirmPassword) {
    errors.push({ msg: 'Please enter all fields' });
  }
  if (password !== confirmPassword) {
    errors.push({ msg: 'Passwords do not match' });
  }
  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  if (errors.length > 0) {
    res.render('pages/register', { errors, username, email, password, confirmPassword });
  } else {
    try {
      // Check if user exists
      const userExists = await User.findOne({ email: email });
      if (userExists) {
        errors.push({ msg: 'Email already registered' });
        return res.render('pages/register', { errors, username, email, password, confirmPassword });
      }

      // Create new user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const newUser = new User({
        username,
        email,
        password: hashedPassword
      });

      await newUser.save();
      req.flash('success_msg', 'You are now registered and can log in');
      res.redirect('/auth/login');

    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'An error occurred during registration.');
      res.redirect('/auth/register');
    }
  }
};

exports.postLogin = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash('error_msg', info.message);
      return res.redirect('/auth/login');
    }
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      // Set long-lived cookie for returning users (e.g. 30 days)
      res.cookie('saved_email', user.email, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
      return res.redirect('/dashboard');
    });
  })(req, res, next);
};

exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    req.flash('success_msg', 'You are logged out');
    res.redirect('/auth/login');
  });
};

exports.postLoginPin = async (req, res, next) => {
  const { email, pin } = req.body;
  
  if (!email || !pin) {
    req.flash('error_msg', 'Please provide PIN');
    return res.redirect('/auth/login');
  }

  try {
    const user = await User.findOne({ email });
    if (!user || !user.pin) {
      req.flash('error_msg', 'Invalid PIN or user not found');
      return res.redirect('/auth/login');
    }

    const isMatch = await bcrypt.compare(pin, user.pin);
    if (isMatch) {
      req.logIn(user, (err) => {
        if (err) { return next(err); }
        res.cookie('saved_email', user.email, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
        return res.redirect('/dashboard');
      });
    } else {
      req.flash('error_msg', 'Incorrect PIN');
      return res.redirect('/auth/login');
    }
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server error');
    return res.redirect('/auth/login');
  }
};
