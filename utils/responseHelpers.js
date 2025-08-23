const { HTTP_STATUS } = require('../constants/validation');

const createResponse = (success, message, data = null, statusCode = HTTP_STATUS.OK) => {
  const response = { success, message };
  if (data) response.data = data;
  return { response, statusCode };
};

const successResponse = (message, data = null, statusCode = HTTP_STATUS.OK) => {
  return createResponse(true, message, data, statusCode);
};

const errorResponse = (message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = null) => {
  const response = createResponse(false, message, null, statusCode);
  if (errors) response.response.errors = errors;
  return response;
};

const sendResponse = (res, { response, statusCode }) => {
  return res.status(statusCode).json(response);
};

const handleAsyncRoute = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  createResponse,
  successResponse,
  errorResponse,
  sendResponse,
  handleAsyncRoute
};