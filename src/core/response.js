const sendSuccess = (res, message = 'Success', data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, message = 'An error occurred', code = 'INTERNAL_ERROR', statusCode = 500, data = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    data,
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
