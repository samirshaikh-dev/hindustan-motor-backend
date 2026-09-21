const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const validate = require('../../middlewares/validate');
const { authenticateAdmin } = require('../../middlewares/auth');
const { loginSchema } = require('./auth.schema');

// Admin login - generates access token + sets HttpOnly refresh token cookie
router.post('/login', validate(loginSchema), authController.login);

// Rotate refresh token - generates new access token + rotates refresh token
router.post('/refresh', authController.refresh);

// Logout - revokes refresh token session and clears cookie
router.post('/logout', authController.logout);

// Get authenticated admin details
router.get('/me', authenticateAdmin, authController.getMe);

module.exports = router;
