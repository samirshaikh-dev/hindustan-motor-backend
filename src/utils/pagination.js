/**
 * Pagination helper utilities
 */

/**
 * Calculates Prisma skip and take from page and limit.
 *
 * @param {number|string} page - Current page number (1-based, default 1)
 * @param {number|string} limit - Items per page (default 20, max 100)
 * @returns {{ skip: number, take: number, page: number, limit: number }}
 */
function getPaginationParams(page = 1, limit = 20) {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  return {
    skip,
    take: parsedLimit,
    page: parsedPage,
    limit: parsedLimit,
  };
}

/**
 * Generates standardized pagination metadata.
 *
 * @param {number} total - Total items matching the query
 * @param {number|string} page - Current page number
 * @param {number|string} limit - Limit per page
 * @returns {{ total: number, page: number, limit: number, totalPages: number, hasNextPage: boolean, hasPrevPage: boolean }}
 */
function createPagination(total, page = 1, limit = 20) {
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const currentLimit = Math.max(1, parseInt(limit, 10) || 20);
  const totalPages = Math.ceil(total / currentLimit);

  return {
    total,
    page: currentPage,
    limit: currentLimit,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}

module.exports = {
  getPaginationParams,
  createPagination,
};
