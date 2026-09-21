const authService = require('./auth.service');
const config = require('../../config/env');
const { sendSuccess } = require('../../core/response');
const asyncHandler = require('../../core/asyncHandler');

const getCookieOptions = () => ({
  httpOnly: true,
  secure: config.COOKIE_SECURE,
  sameSite: config.COOKIE_SAME_SITE,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
  const userAgent = req.headers['user-agent'] || null;

  const result = await authService.login(email, password, { ipAddress, userAgent });

  // Set refresh token in HttpOnly secure cookie
  res.cookie('refreshToken', result.refreshToken, getCookieOptions());

  // Never expose the refresh token in the JSON response body
  const responseData = { ...result };
  delete responseData.refreshToken;

  return sendSuccess(res, 'Admin login successful', responseData, 200);
});

const refresh = asyncHandler(async (req, res) => {
  // Read refresh token from secure cookie (or body fallback for API clients)
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
  const userAgent = req.headers['user-agent'] || null;

  try {
    const result = await authService.rotateRefreshToken(token, { ipAddress, userAgent });

    // Update refresh token cookie with newly rotated token
    res.cookie('refreshToken', result.refreshToken, getCookieOptions());

    // Never expose the refresh token in the JSON response body
    const responseData = { ...result };
    delete responseData.refreshToken;

    return sendSuccess(res, 'Access token refreshed successfully', responseData, 200);
  } catch (error) {
    if (['TOKEN_REUSE_DETECTED', 'INVALID_REFRESH_TOKEN', 'REFRESH_TOKEN_EXPIRED'].includes(error.code)) {
      res.clearCookie('refreshToken', {
        ...getCookieOptions(),
        maxAge: 0,
      });
    }
    throw error;
  }
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (token) {
    await authService.logout(token);
  }

  // Clear cookie
  res.clearCookie('refreshToken', {
    ...getCookieOptions(),
    maxAge: 0,
  });

  return sendSuccess(res, 'Logged out successfully', null, 200);
});

const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, 'Admin profile retrieved', req.admin, 200);
});

module.exports = {
  login,
  refresh,
  logout,
  getMe,
};
