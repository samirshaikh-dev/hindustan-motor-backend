const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
    data: null,
  });
};

module.exports = notFoundHandler;
