const ApiError = require("../utils/apiError");
const { ZodError } = require("zod");

function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: err.flatten(),
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }

  console.error(err);
  return res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
    details: {},
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: "Route not found", code: "ROUTE_NOT_FOUND", details: {} });
}

module.exports = { errorHandler, notFoundHandler };
