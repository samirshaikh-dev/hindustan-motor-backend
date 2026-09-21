const streamifier = require('stream');
const cloudinary = require('../../config/cloudinary');
const prisma = require('../../config/prisma');
const historyService = require('../history/history.service');
const { NotFoundError, BadRequestError } = require('../../core/errors');

class MediaService {
  async uploadToCloudinary(fileBuffer, folder = 'hindustan-motors') {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            return reject(new BadRequestError(`Cloudinary upload failed: ${error.message}`, 'UPLOAD_FAILED'));
          }
          resolve(result);
        }
      );

      const bufferStream = new streamifier.PassThrough();
      bufferStream.end(fileBuffer);
      bufferStream.pipe(uploadStream);
    });
  }

  async uploadMotorImage(motorId, file, actorEmployee) {
    // 1. Verify motor exists
    const motor = await prisma.motor.findUnique({
      where: { id: motorId },
    });

    if (!motor) {
      throw new NotFoundError('Motor not found', 'MOTOR_NOT_FOUND');
    }

    // 2. Upload to Cloudinary
    const cloudinaryResult = await this.uploadToCloudinary(file.buffer, `motors/${motor.motorNumber}`);

    // 3. Save to database
    const motorImage = await prisma.motorImage.create({
      data: {
        motorId,
        publicId: cloudinaryResult.public_id,
        secureUrl: cloudinaryResult.secure_url,
        resourceType: cloudinaryResult.resource_type || 'image',
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        bytes: cloudinaryResult.bytes,
        format: cloudinaryResult.format,
      },
    });

    // 4. Record history
    await historyService.recordHistory({
      motorId,
      actorEmployeeId: actorEmployee.id,
      action: 'MOTOR_IMAGE_UPLOADED',
      description: `Image uploaded for motor ${motor.motorNumber}`,
      metadata: {
        imageId: motorImage.id,
        publicId: motorImage.publicId,
        secureUrl: motorImage.secureUrl,
      },
    });

    return motorImage;
  }
}

module.exports = new MediaService();
