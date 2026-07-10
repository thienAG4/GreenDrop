const vouchersService = require('../services/vouchers.service');
const asyncHandler = require('../utils/async-handler');

const list = asyncHandler(async (req, res) => {
  const vouchers = await vouchersService.listVouchers();
  res.json({ data: vouchers });
});

const listActive = asyncHandler(async (req, res) => {
  const vouchers = await vouchersService.listActiveVouchers();
  res.json({ data: vouchers });
});

const create = asyncHandler(async (req, res) => {
  const voucher = await vouchersService.createVoucher(req.user.user_id, req.body);
  res.status(201).json({ data: voucher, message: 'Voucher created' });
});

const update = asyncHandler(async (req, res) => {
  const voucher = await vouchersService.updateVoucher(req.params.id, req.body);
  res.json({ data: voucher, message: 'Voucher updated' });
});

const remove = asyncHandler(async (req, res) => {
  await vouchersService.deleteVoucher(req.params.id);
  res.json({ data: null, message: 'Voucher deleted' });
});

const check = asyncHandler(async (req, res) => {
  const { discount_amount, voucher } = await vouchersService.checkVoucher(
    req.params.code,
    req.query.subtotal
  );
  res.json({ data: { discount_amount, voucher } });
});

module.exports = { list, listActive, create, update, remove, check };
