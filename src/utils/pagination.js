function parsePagination(query, { maxLimit = 100, defaultLimit = 20 } = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildPaginatedResponse(data, total, page, limit) {
  return { data, total, page, limit };
}

module.exports = { parsePagination, buildPaginatedResponse };
