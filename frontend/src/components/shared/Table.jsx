// File này đã chuyển hoàn toàn sang PaginationTable.jsx, file này không còn sử dụng nữa
import React from 'react';
import Pagination from './PaginationTable'; // Import the existing PaginationTable component

const Table = ({
  columns = [],
  data = [],
  className = '',
  currentPage = 1,
  totalPages = 1,
  onPageChange = () => { },
}) => {
  // Kiểm tra dữ liệu trước khi render
  const hasData = Array.isArray(data) && data.length > 0;
  const hasColumns = Array.isArray(columns) && columns.length > 0;

  // Kiểm tra nếu không có dữ liệu hoặc cột
  if (!hasData || !hasColumns) {
    return (
      <div className={`bg-white shadow border border-gray-200 sm:rounded-lg ${className}`}>
        <div className="text-center text-gray-500 py-8">
          Không có dữ liệu hiển thị.
        </div>

        {/* Hiển thị pagination nếu có nhiều trang, ngay cả khi không có dữ liệu ở trang hiện tại */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200">
            <Pagination
              columns={columns} // Pass columns
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flow-root shadow border border-gray-200 sm:rounded-lg ${className}`}>
      <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column, index) => (
                    <th
                      key={typeof column.accessor === 'string' ? column.accessor : `col-${index}`}
                      scope="col"
                      className="py-3.5 px-3 text-center text-sm font-semibold text-gray-900"
                    >
                      {column.Header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.map((row, rowIndex) => (
                  <tr key={row.id || `row-${rowIndex}`} className="hover:bg-gray-50">
                    {columns.map((column, colIndex) => {
                      // Get cell value based on accessor type
                      let cellValue = null;

                      if (typeof column.accessor === 'function') {
                        // If accessor is a function, call it with the row
                        try {
                          cellValue = column.accessor(row);
                        } catch (error) {
                          console.error('Error accessing row data:', error);
                          cellValue = null;
                        }
                      } else if (typeof column.accessor === 'string') {
                        // If accessor is a string, use dot notation to get nested properties
                        try {
                          cellValue = column.accessor.split('.').reduce((o, k) => (o || {})[k], row);
                        } catch (error) {
                          console.error('Error accessing nested row data:', error);
                          cellValue = null;
                        }
                      }

                      return (
                        <td
                          key={`cell-${rowIndex}-${colIndex}`}
                          className="whitespace-nowrap py-4 px-3 text-sm text-gray-700 text-center"
                        >
                          {column.Cell ? (
                            (() => {
                              try {
                                return column.Cell({
                                  value: cellValue,
                                  row: {
                                    original: row,
                                    index: rowIndex,
                                    // Add any other properties the Cell might expect
                                  }
                                });
                              } catch (error) {
                                console.error('Error rendering cell:', error);
                                return '-';
                              }
                            })()
                          ) : (
                            cellValue ?? '-'
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Always render pagination component if totalPages > 1 */}
          {totalPages > 1 && (
            <div className="border-t border-gray-200">
              <Pagination
                columns={columns} // Pass columns
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Table;