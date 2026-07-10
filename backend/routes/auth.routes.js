const router = require('express').Router();
const controller = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/me', requireAuth, controller.me);
router.post('/forgot-password', controller.forgotPassword);
router.post('/verify-reset-code', controller.verifyResetCode);
router.post('/reset-password', controller.resetPassword);
router.post('/change-password', requireAuth, controller.changePassword);

module.exports = router;
