const router = require('express').Router();
const controller = require('../controllers/users.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth);

router.put('/me', controller.updateProfile);
router.get('/me/addresses', controller.listAddresses);
router.post('/me/addresses', controller.addAddress);
router.put('/me/addresses/:id', controller.updateAddress);
router.delete('/me/addresses/:id', controller.deleteAddress);

router.get('/', requireAdmin, controller.listUsers);
router.get('/:id', requireAdmin, controller.getUserDetail);
router.put('/:id/status', requireAdmin, controller.setUserStatus);

module.exports = router;
