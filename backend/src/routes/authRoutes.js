const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { registerRules, loginRules, validate } = require('../middleware/validationMiddleware');

// Public routes
router.post('/register', registerRules, validate, AuthController.register);
router.post('/login', loginRules, validate, AuthController.login);

// Protected routes
router.get('/me', authenticateToken, AuthController.getProfile);
router.post('/logout', authenticateToken, AuthController.logout);

module.exports = router;
