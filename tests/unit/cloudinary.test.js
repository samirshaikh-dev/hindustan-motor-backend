const { optimizeCloudinaryUrl } = require('../../src/config/cloudinary');

describe('Cloudinary URL Optimizer', () => {
  it('should transform a cloudinary image URL with f_auto and q_auto', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    const optimized = optimizeCloudinaryUrl(url);
    expect(optimized).toContain('f_auto=auto');
    expect(optimized).toContain('q_auto=auto');
    expect(optimized.startsWith('https://res.cloudinary.com/demo/image/upload/sample.jpg?')).toBe(true);
  });

  it('should append width parameter when option is provided', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    const optimized = optimizeCloudinaryUrl(url, { width: 800 });
    expect(optimized).toContain('w=800');
  });

  it('should preserve existing query parameters and use & separator', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg?v=123';
    const optimized = optimizeCloudinaryUrl(url);
    expect(optimized).toContain('v=123&');
    expect(optimized).toContain('f_auto=auto');
  });

  it('should return non-cloudinary URLs untouched', () => {
    const url = 'https://images.unsplash.com/photo-123';
    expect(optimizeCloudinaryUrl(url)).toBe(url);
  });

  it('should handle falsy/empty url safely', () => {
    expect(optimizeCloudinaryUrl('')).toBe('');
    expect(optimizeCloudinaryUrl(null)).toBe(null);
  });
});
