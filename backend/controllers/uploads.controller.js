const asyncHandler = require('../utils/async-handler');

function fileUrls(req, subfolder) {
  if (!req.files || !req.files.length) return [];
  const base = process.env.PUBLIC_UPLOADS_URL || '/uploads';
  return req.files.map((f) => ({ url: `${base}/${subfolder}/${f.filename}` }));
}

const uploadImages = asyncHandler(async (req, res) => {
  res.status(201).json({ data: fileUrls(req, req.uploadSubfolder), message: 'Images uploaded' });
});

module.exports = { uploadImages };
