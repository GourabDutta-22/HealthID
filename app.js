require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo').default || require('connect-mongo');
const flash = require('connect-flash');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const { csrfSync } = require('csrf-sync');
const connectDB = require('./config/database');

const { csrfSynchronisedProtection, generateToken } = csrfSync({
  getTokenFromRequest: (req) => {
    return (req.body && req.body['_csrf']) || req.query['_csrf'] || req.headers['x-csrf-token'];
  }
});

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Passport config
require('./config/passport')(passport);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// View Engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Trust reverse proxy (Crucial for Render/Heroku to allow secure cookies)
app.set('trust proxy', 1);

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Security Middlewares
app.use(helmet({
  // Disable HSTS so the app works over plain HTTP on local network (phone/tablet).
  // Enable this only when deployed with a real HTTPS certificate.
  hsts: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"]
    }
  }
}));

// Connect flash
app.use(flash());

// CSRF Protection
app.use(csrfSynchronisedProtection);

// Global variables middleware
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  res.locals.csrfToken = generateToken(req);
  next();
});

// Routes
app.use('/', require('./routes/indexRoutes'));
app.use('/auth', require('./routes/authRoutes'));
app.use('/profile', require('./routes/profileRoutes'));
app.use('/emergency', require('./routes/qrRoutes'));
app.use('/reports', require('./routes/reportRoutes'));
app.use('/allergy', require('./routes/allergyRoutes'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
