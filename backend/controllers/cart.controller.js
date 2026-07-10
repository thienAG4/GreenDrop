const cartService = require('../services/cart.service');
const asyncHandler = require('../utils/async-handler');
const HttpError = require('../utils/http-error');

function cartIdentity(req) {
  if (req.user) return { userId: req.user.user_id };
  const sessionToken = req.header('x-session-token');
  if (!sessionToken) {
    throw new HttpError(400, 'Missing X-Session-Token header for guest cart');
  }
  return { sessionToken };
}

const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getOrCreateCart(cartIdentity(req));
  const view = await cartService.getCartView(cart);
  res.json({ data: view });
});

const addItem = asyncHandler(async (req, res) => {
  const cart = await cartService.getOrCreateCart(cartIdentity(req));
  const view = await cartService.addItem(cart, req.body);
  res.status(201).json({ data: view, message: 'Item added to cart' });
});

const updateItem = asyncHandler(async (req, res) => {
  const cart = await cartService.getOrCreateCart(cartIdentity(req));
  const view = await cartService.setItemQuantity(cart, req.body, req.body.quantity);
  res.json({ data: view, message: 'Cart updated' });
});

const removeItem = asyncHandler(async (req, res) => {
  const cart = await cartService.getOrCreateCart(cartIdentity(req));
  const view = await cartService.removeItem(cart, req.body);
  res.json({ data: view, message: 'Item removed from cart' });
});

module.exports = { getCart, addItem, updateItem, removeItem, cartIdentity };
