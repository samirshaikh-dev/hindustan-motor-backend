const crypto = require('crypto');

const generateUniqueNumber = (prefix = 'MTR') => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${dateStr}-${randomSuffix}`;
};

module.exports = {
  generateUniqueNumber,
};
