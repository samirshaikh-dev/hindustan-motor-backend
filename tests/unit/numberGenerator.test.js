const { generateUniqueNumber } = require('../../src/utils/numberGenerator');

describe('Number Generator Utility', () => {
  it('should generate a motor number with MTR prefix and expected format', () => {
    const num = generateUniqueNumber('MTR');
    expect(num).toMatch(/^MTR-\d{8}-[A-F0-9]{6}$/);
  });

  it('should generate a job number with JOB prefix and expected format', () => {
    const num = generateUniqueNumber('JOB');
    expect(num).toMatch(/^JOB-\d{8}-[A-F0-9]{6}$/);
  });

  it('should generate unique values consecutively', () => {
    const num1 = generateUniqueNumber('MTR');
    const num2 = generateUniqueNumber('MTR');
    expect(num1).not.toBe(num2);
  });
});
