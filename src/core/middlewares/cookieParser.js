const cookieParser = (req, res, next) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;

  if (cookieHeader && typeof cookieHeader === 'string') {
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const idx = pair.indexOf('=');
      if (idx !== -1) {
        const key = pair.substring(0, idx).trim();
        const val = pair.substring(idx + 1).trim();
        try {
          req.cookies[key] = decodeURIComponent(val);
        } catch {
          req.cookies[key] = val;
        }
      }
    }
  }

  next();
};

module.exports = cookieParser;
