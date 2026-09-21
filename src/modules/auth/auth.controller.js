const authService = require('./auth.service');
const { sendSuccess } = require('../../core/response');
const asyncHandler = require('../../core/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  return sendSuccess(res, 'Admin login successful', result, 200);
});

const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, 'Admin profile retrieved', req.admin, 200);
});

module.exports = {
  login,
  getMe,
};
