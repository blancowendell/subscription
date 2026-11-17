/**
 * Extracts and calculates pagination/search parameters from an Express request.
 * @param {Object} req - The Express request object.
 * @param {number} defaultLimit - Default number of items per page.
 * @returns {Object} { page, limit, offset, search }
 */
const getPaginationParams = (req, defaultLimit = 10) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || defaultLimit;
  const offset = (page - 1) * limit;
  const search = req.query.search ? req.query.search.trim() : "";

  return { page, limit, offset, search };
};

/**
 * Builds a dynamic SQL LIKE clause for multiple columns safely.
 * @param {string} search - The search term.
 * @param {Array<string>} columns - Array of database column names to search across.
 * @returns {Object} { searchClause: string, searchParams: Array }
 */
const buildSearchQuery = (search, columns = []) => {
  if (!search || columns.length === 0) {
    // Return empty values if there is no search active
    return { searchClause: "", searchParams: [] };
  }

  const wildcard = `%${search}%`;
  const searchParams = [];
  
  // Map over columns to create "col LIKE ?" and push a wildcard for each
  const likeConditions = columns.map((col) => {
    searchParams.push(wildcard);
    return `${col} LIKE ?`;
  });

  // Wrap in parentheses to ensure it plays nicely with other AND conditions
  const searchClause = ` AND (${likeConditions.join(" OR ")})`;

  return { searchClause, searchParams };
};

/**
 * Formats the standardized paginated response payload.
 * @param {Array} data - The queried database results.
 * @param {number} totalItems - Total count of items in the database.
 * @param {number} page - Current page number.
 * @param {number} limit - Items per page.
 * @returns {Object} Formatted JSON response object.
 */
const buildPaginatedResponse = (data, totalItems, page, limit) => {
  return {
    success: true,
    data: data || [],
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      currentPage: page,
      limit,
    },
  };
};

module.exports = {
  getPaginationParams,
  buildSearchQuery,
  buildPaginatedResponse,
};