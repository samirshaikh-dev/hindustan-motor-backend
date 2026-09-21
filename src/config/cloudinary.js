const { v2: cloudinary } = require('cloudinary');
const config = require('./env');

const cloudinaryConfig = {
  secure: true,
};

if (config.CLOUDINARY_URL) {
  cloudinaryConfig.cloudinary_url = config.CLOUDINARY_URL;
}

cloudinary.config(cloudinaryConfig);

/**
 * Appends Cloudinary auto-format and quality transformations to a URL.
 * Converts: https://res.cloudinary.com/.../image.jpg
 * To:      https://res.cloudinary.com/.../image.jpg?f_auto,q_auto,w_<width>
 *
 * Only transforms Cloudinary URLs; returns other URLs unchanged.
 * @param {string} url
 * @param {{ width?: number; quality?: number }} [options]
 * @returns {string}
 */
function optimizeCloudinaryUrl(url, options = {}) {
  if (!url || !url.includes('cloudinary.com')) return url;

  const params = new URLSearchParams();
  params.set('f_auto', 'auto');
  params.set('q_auto', 'auto');
  if (options?.width) params.set('w', String(options.width));

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${params.toString()}`;
}

cloudinary.optimizeCloudinaryUrl = optimizeCloudinaryUrl;
cloudinary.cloudinary = cloudinary;

module.exports = cloudinary;
