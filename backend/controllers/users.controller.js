const usersService = require('../services/users.service');
const asyncHandler = require('../utils/async-handler');

const updateProfile = asyncHandler(async (req, res) => {
  const user = await usersService.updateProfile(req.user.user_id, req.body);
  res.json({ data: user, message: 'Profile updated' });
});

const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await usersService.listAddresses(req.user.user_id);
  res.json({ data: addresses });
});

const addAddress = asyncHandler(async (req, res) => {
  const address = await usersService.addAddress(req.user.user_id, req.body);
  res.status(201).json({ data: address, message: 'Address added' });
});

const updateAddress = asyncHandler(async (req, res) => {
  const address = await usersService.updateAddress(req.user.user_id, req.params.id, req.body);
  res.json({ data: address, message: 'Address updated' });
});

const deleteAddress = asyncHandler(async (req, res) => {
  await usersService.deleteAddress(req.user.user_id, req.params.id);
  res.json({ data: null, message: 'Address deleted' });
});

const listUsers = asyncHandler(async (req, res) => {
  const result = await usersService.listUsers(req.query);
  res.json({ data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } });
});

const getUserDetail = asyncHandler(async (req, res) => {
  const user = await usersService.getUserDetailAdmin(req.params.id);
  res.json({ data: user });
});

const setUserStatus = asyncHandler(async (req, res) => {
  await usersService.setUserStatus(req.params.id, req.body.status);
  res.json({ data: null, message: 'User status updated' });
});

module.exports = {
  updateProfile,
  listAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  listUsers,
  getUserDetail,
  setUserStatus,
};
