const router = require('express').Router();
const controller = require('../controllers/cart.controller');
const { optionalAuth } = require('../middleware/auth');

router.use(optionalAuth);

router.get('/', controller.getCart);
router.post('/items', controller.addItem);
router.put('/items', controller.updateItem);
router.delete('/items', controller.removeItem);

module.exports = router;
