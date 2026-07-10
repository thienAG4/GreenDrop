const ordersService = require('../services/orders.service');
const asyncHandler = require('../utils/async-handler');
const HttpError = require('../utils/http-error');
const { STAFF_ROLES } = require('../utils/constants');

function cartIdentity(req) {
  if (req.user) return { userId: req.user.user_id };
  const sessionToken = req.header('x-session-token');
  if (!sessionToken) throw new HttpError(400, 'Missing X-Session-Token header for guest checkout');
  return { sessionToken };
}

const checkout = asyncHandler(async (req, res) => {
  const result = await ordersService.checkout(cartIdentity(req), req.body);
  res.status(201).json({ data: result, message: 'Order placed successfully' });
});

const mine = asyncHandler(async (req, res) => {
  const orders = await ordersService.listOrdersForUser(req.user.user_id);
  res.json({ data: orders });
});

const adminList = asyncHandler(async (req, res) => {
  const result = await ordersService.listOrdersAdmin(req.query);
  res.json({ data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } });
});

const adminStats = asyncHandler(async (req, res) => {
  const counts = await ordersService.getOrderStatusCounts();
  res.json({ data: counts });
});

const track = asyncHandler(async (req, res) => {
  const { order_id, phone } = req.query;
  if (!order_id || !phone) throw new HttpError(400, 'order_id and phone are required');
  const order = await ordersService.trackOrder(order_id, phone);
  res.json({ data: order });
});

const detail = asyncHandler(async (req, res) => {
  const order = await ordersService.getOrderDetail(req.params.id);
  const isOwner = req.user && order.user_id === req.user.user_id;
  const isStaff = req.user && STAFF_ROLES.includes(req.user.role);
  // Guest checkout never issues a token (the guest USERS row is created silently,
  // per README), so an anonymous request has no way to prove ownership. Only block
  // when the requester IS authenticated as someone else's account and isn't staff -
  // otherwise the checkout-payment/checkout-success pages 403 for every guest order.
  if (req.user && !isOwner && !isStaff) throw new HttpError(403, 'This is not your order');
  res.json({ data: order });
});

const confirmPayment = asyncHandler(async (req, res) => {
  const order = await ordersService.confirmPayment(req.params.id, req.body.outcome);
  res.json({ data: order, message: 'Payment result recorded' });
});

const cancel = asyncHandler(async (req, res) => {
  const order = await ordersService.customerCancelOrder(
    req.params.id,
    req.body.reason,
    req.user.user_id,
    req.body.bank_info
  );
  res.json({ data: order, message: 'Order cancelled' });
});

const updateStatus = asyncHandler(async (req, res) => {
  const order = await ordersService.updateOrderStatus(req.params.id, req.body.status, req.user.user_id);
  res.json({ data: order, message: 'Order status updated' });
});

const adminCancel = asyncHandler(async (req, res) => {
  const order = await ordersService.adminCancelOrder(req.params.id, req.body.reason, req.user.user_id);
  res.json({ data: order, message: 'Order cancelled' });
});

module.exports = {
  checkout,
  mine,
  adminList,
  adminStats,
  track,
  detail,
  confirmPayment,
  cancel,
  updateStatus,
  adminCancel,
};
