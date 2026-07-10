const returnsService = require('../services/returns.service');
const refundsService = require('../services/refunds.service');
const asyncHandler = require('../utils/async-handler');
const HttpError = require('../utils/http-error');
const { STAFF_ROLES } = require('../utils/constants');

function fileUrls(req) {
  const base = process.env.PUBLIC_UPLOADS_URL || '/uploads';
  return (req.files || []).map((f) => `${base}/returns/${f.filename}`);
}

const listMine = asyncHandler(async (req, res) => {
  const returns = await returnsService.listMyReturns(req.user.user_id);
  res.json({ data: returns });
});

const listAll = asyncHandler(async (req, res) => {
  const returns = await returnsService.listAllReturns(req.query);
  res.json({ data: returns });
});

const detail = asyncHandler(async (req, res) => {
  const returnRequest = await returnsService.getReturnDetail(req.params.id);
  const isOwner = returnRequest.customer_user_id === req.user.user_id;
  if (!isOwner && !STAFF_ROLES.includes(req.user.role)) {
    throw new HttpError(403, 'This is not your return request');
  }
  res.json({ data: returnRequest });
});

const create = asyncHandler(async (req, res) => {
  const evidence_urls = fileUrls(req);
  const returnRequest = await returnsService.createReturnRequest(req.user.user_id, {
    ...req.body,
    evidence_urls,
  });
  res.status(201).json({ data: returnRequest, message: 'Return request submitted' });
});

const approve = asyncHandler(async (req, res) => {
  const returnRequest = await returnsService.approveReturn(req.params.id, req.user.user_id);
  res.json({ data: returnRequest, message: 'Return request approved' });
});

const reject = asyncHandler(async (req, res) => {
  const returnRequest = await returnsService.rejectReturn(req.params.id, req.user.user_id, req.body.reject_reason);
  res.json({ data: returnRequest, message: 'Return request rejected' });
});

const itemReceived = asyncHandler(async (req, res) => {
  const returnRequest = await returnsService.markItemReceived(req.params.id, req.user.user_id, req.body);
  res.json({ data: returnRequest, message: 'Item received and refund processed' });
});

const submitTracking = asyncHandler(async (req, res) => {
  const returnRequest = await returnsService.submitTracking(req.user.user_id, req.params.id, req.body.tracking_number);
  res.json({ data: returnRequest, message: 'Tracking information submitted' });
});

const listRefunds = asyncHandler(async (req, res) => {
  const refunds = await refundsService.listRefunds(req.query);
  res.json({ data: refunds });
});

const retryRefund = asyncHandler(async (req, res) => {
  const refund = await refundsService.retryRefund(req.params.refundId, req.body.simulate_outcome);
  res.json({ data: refund, message: 'Refund retry attempted' });
});

module.exports = {
  listMine,
  listAll,
  detail,
  create,
  approve,
  reject,
  itemReceived,
  submitTracking,
  listRefunds,
  retryRefund,
};
