const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const validate = require('../../middlewares/validate');
const { authenticateAdmin } = require('../../middlewares/auth');
const { loginSchema } = require('./auth.schema');

// Admin login
router.post('/login', validate(loginSchema), authController.login);

// Get authenticated admin details
router.get('/me', authenticateAdmin, authController.getMe);

module.exports = router;
