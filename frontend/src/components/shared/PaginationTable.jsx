import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const PaginationTable = ({
  columns,
  data = [],
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalRecords = 0,
  recordsPerPage = 10,
  showingText = "",
  outOfText = "trên tổng số",
  recordsText = "bản ghi",
  pageText = "Trang"
}) => {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; // Maximum number of page numbers to show

    // Đảm bảo totalPages là số hợp lệ
    const validTotalPages = Math.max(1, totalPages || 1);
    // Đảm bảo currentPage là số hợp lệ
    const validCurrentPage = Math.min(Math.max(1, currentPage || 1), validTotalPages);

    let startPage = Math.max(1, validCurrentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(validTotalPages, startPage + maxPagesToShow - 1);

    // Adjust startPage if we're near the end
    if (endPage - startPage + 1 < maxPagesToShow && startPage > 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return pageNumbers;
  };

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
      {/* Display information about shown records */}
      {totalRecords > 0 && (
        <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600 border-b border-gray-200">
          {showingText} {"("} {Math.min(data.length, recordsPerPage)} {outOfText} {totalRecords} {recordsText} {")"}
          {totalPages > 1 && ` - ${pageText} ${currentPage}/${totalPages}`}
        </div>
      )}

      {/* Table with improved layout */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ minWidth: column.minWidth || 'auto', fontSize: '0.7rem' }}
                >
                  {column.Header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {columns.map((column, colIndex) => (
                    <td key={colIndex} className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap text-center">
                      {column.Cell ? column.Cell({ value: row[column.accessor], row: { original: row } }) :
                        // Handle nested properties like 'building.name'
                        column.accessor && column.accessor.includes('.') ?
                          column.accessor.split('.').reduce((obj, key) => obj && obj[key], row) :
                          row[column.accessor]
                      }
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination with improved styling */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center rounded-md border px-3 py-1 text-sm font-medium ${currentPage === 1
                ? 'border-gray-300 bg-white text-gray-300 cursor-not-allowed'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
              Trước
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`relative ml-3 inline-flex items-center rounded-md border px-3 py-1 text-sm font-medium ${currentPage === totalPages
                ? 'border-gray-300 bg-white text-gray-300 cursor-not-allowed'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
              Sau
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                {pageText} <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                {/* Previous button */}
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-1 text-gray-400 ring-1 ring-inset ring-gray-300 ${currentPage === 1
                    ? 'cursor-not-allowed'
                    : 'hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                    }`}
                >
                  <span className="sr-only">Trang trước</span>
                  <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                </button>

                {/* First page */}
                {getPageNumbers().length > 0 && getPageNumbers()[0] > 1 && (
                  <>
                    <button
                      onClick={() => onPageChange(1)}
                      className={`relative inline-flex items-center px-3 py-1 text-sm font-semibold ${currentPage === 1
                        ? 'bg-indigo-600 text-white focus-visible:outline-indigo-600 z-10'
                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                        }`}
                    >
                      1
                    </button>

                    {getPageNumbers().length > 0 && getPageNumbers()[0] > 2 && (
                      <span className="relative inline-flex items-center px-3 py-1 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                        ...
                      </span>
                    )}
                  </>
                )}

                {/* Page numbers */}
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`relative inline-flex items-center px-3 py-1 text-sm font-semibold ${currentPage === page
                      ? 'bg-indigo-600 text-white focus-visible:outline-indigo-600 z-10'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      }`}
                  >
                    {page}
                  </button>
                ))}

                {/* Last page */}
                {getPageNumbers().length > 0 && getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                  <>
                    {getPageNumbers().length > 0 && getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                      <span className="relative inline-flex items-center px-3 py-1 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                        ...
                      </span>
                    )}

                    <button
                      onClick={() => onPageChange(totalPages)}
                      className={`relative inline-flex items-center px-3 py-1 text-sm font-semibold ${currentPage === totalPages
                        ? 'bg-indigo-600 text-white focus-visible:outline-indigo-600 z-10'
                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                        }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                {/* Next button */}
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-1 text-gray-400 ring-1 ring-inset ring-gray-300 ${currentPage === totalPages
                    ? 'cursor-not-allowed'
                    : 'hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                    }`}
                >
                  <span className="sr-only">Trang sau</span>
                  <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaginationTable;