const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

function paginate(rows, query, { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = {}) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  return {
    items: rows.slice(offset, offset + limit),
    count: Math.min(limit, Math.max(rows.length - offset, 0)),
    total: rows.length,
    limit,
    offset,
  };
}

module.exports = { paginate };
