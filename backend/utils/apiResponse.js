// backend/utils/apiResponse.js
const successResponse = (res, data, statusCode = 200) => {
    return res.status(statusCode).json(data);
  };
  
  const errorResponse = (res, message, statusCode = 400) => {
    return res.status(statusCode).json({ message });
  };
  
  module.exports = {
    successResponse,
    errorResponse
  };