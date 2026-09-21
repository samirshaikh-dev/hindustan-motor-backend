const mediaService = require('./media.service');
const { sendSuccess } = require('../../core/response');
const { BadRequestError } = require('../../core/errors');
const asyncHandler = require('../../core/asyncHandler');

const uploadMotorImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new BadRequestError('No image file provided', 'FILE_REQUIRED');
  }

  const { id } = req.params;
  const image = await mediaService.uploadMotorImage(id, req.file, req.actor);
  return sendSuccess(res, 'Motor image uploaded successfully', image, 201);
});

module.exports = {
  uploadMotorImage,
};
