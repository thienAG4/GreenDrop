const promotionsService = require('../services/promotions.service');
const asyncHandler = require('../utils/async-handler');

const listActive = asyncHandler(async (req, res) => {
  const events = await promotionsService.listActiveEvents();
  res.json({ data: events });
});

const listAll = asyncHandler(async (req, res) => {
  const events = await promotionsService.listAllEvents();
  res.json({ data: events });
});

const create = asyncHandler(async (req, res) => {
  const event = await promotionsService.createEvent(req.user.user_id, req.body);
  res.status(201).json({ data: event, message: 'Promotion event created' });
});

const update = asyncHandler(async (req, res) => {
  const event = await promotionsService.updateEvent(req.params.id, req.body);
  res.json({ data: event, message: 'Promotion event updated' });
});

const remove = asyncHandler(async (req, res) => {
  await promotionsService.deleteEvent(req.params.id);
  res.json({ data: null, message: 'Promotion event deleted' });
});

module.exports = { listActive, listAll, create, update, remove };
