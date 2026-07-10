const authService = require('../services/auth.service');
const cartService = require('../services/cart.service');
const asyncHandler = require('../utils/async-handler');

const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body);
  await cartService.mergeGuestCartIntoUser(req.header('x-session-token'), user.user_id);
  res.status(201).json({ data: { user, token }, message: 'Account created successfully' });
});

const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body);
  await cartService.mergeGuestCartIntoUser(req.header('x-session-token'), user.user_id);
  res.json({ data: { user, token }, message: 'Logged in successfully' });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getById(req.user.user_id);
  res.json({ data: user });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email);
  res.json({ data: null, message: result.message });
});

const verifyResetCode = asyncHandler(async (req, res) => {
  const resetToken = authService.verifyResetCode(req.body.email, req.body.code);
  res.json({ data: { reset_token: resetToken }, message: 'Code verified' });
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.reset_token, req.body.new_password);
  res.json({ data: null, message: 'Password has been reset. Please log in.' });
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.user_id, req.body.current_password, req.body.new_password);
  res.json({ data: null, message: 'Password updated' });
});

module.exports = { register, login, me, forgotPassword, verifyResetCode, resetPassword, changePassword };
