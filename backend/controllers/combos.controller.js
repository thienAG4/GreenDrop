const combosService = require('../services/combos.service');
const asyncHandler = require('../utils/async-handler');
const HttpError = require('../utils/http-error');
const { COMBO_TYPE } = require('../utils/constants');

const listMine = asyncHandler(async (req, res) => {
  const designs = await combosService.listMyDesigns(req.user.user_id);
  res.json({ data: designs });
});

const listAllAdmin = asyncHandler(async (req, res) => {
  const designs = await combosService.listAllCombos();
  res.json({ data: designs });
});

// Public community catalog - any visitor can browse saved designs to buy.
const listPublic = asyncHandler(async (req, res) => {
  const combos = await combosService.listPublicCombos();
  res.json({ data: combos });
});

const detail = asyncHandler(async (req, res) => {
  const combo = await combosService.getComboDetail(req.params.id);
  res.json({ data: combo });
});

const create = asyncHandler(async (req, res) => {
  // BR-07: only Customers may use the 3D Terrarium Studio; the AI Builder has no such restriction.
  if (req.body.combo_type === COMBO_TYPE.BUILDER_3D && req.user.role !== 'customer') {
    throw new HttpError(403, 'Only customer accounts can use the 3D Terrarium Studio');
  }
  const combo = await combosService.createCombo(req.user.user_id, req.body);
  res.status(201).json({ data: combo, message: 'Design saved' });
});

const update = asyncHandler(async (req, res) => {
  // Admins may edit any user's design from the admin panel's combo management
  // page; everyone else may only edit their own (enforced in the service).
  const combo = await combosService.updateCombo(req.user.user_id, req.params.id, req.body, req.user.role === 'admin');
  res.json({ data: combo, message: 'Design updated' });
});

const remove = asyncHandler(async (req, res) => {
  await combosService.deleteCombo(req.user.user_id, req.params.id, req.user.role === 'admin');
  res.json({ data: null, message: 'Design deleted' });
});

const aiPreview = asyncHandler(async (req, res) => {
  const preview = await combosService.generateAiPreview(req.body.items || []);
  res.json({ data: preview });
});

module.exports = { listMine, listAllAdmin, listPublic, detail, create, update, remove, aiPreview };
