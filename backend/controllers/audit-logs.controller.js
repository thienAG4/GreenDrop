const auditLogsService = require('../services/audit-logs.service');
const asyncHandler = require('../utils/async-handler');

const list = asyncHandler(async (req, res) => {
  const logs = await auditLogsService.list(req.query);
  res.json({ data: logs });
});

module.exports = { list };
