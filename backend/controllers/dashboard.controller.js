const dashboardService = require('../services/dashboard.service');
const asyncHandler = require('../utils/async-handler');

const getStats = asyncHandler(async (req, res) => {
  const stats = await dashboardService.getStats();
  res.json({ data: stats });
});

module.exports = { getStats };
