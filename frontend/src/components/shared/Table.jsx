import React from 'react';

const Table = ({ columns = [], data = [], className = '' }) => {
  if (!columns.length || !data.length) {
    return <p className="text-center text-gray-500 py-4">Không có dữ liệu hiển thị.</p>;
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
                      key={column.accessor || index}
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      {column.Header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {columns.map((column, colIndex) => {
                      // Lấy giá trị: ưu tiên Cell render function, sau đó là accessor
                      const cellValue = column.accessor
                        ? column.accessor.split('.').reduce((o, k) => (o || {})[k], row) // Hỗ trợ nested accessor (vd: 'building.name')
                        : null;

                      return (
                        <td
                          key={column.accessor || colIndex}
                          className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-700 sm:pl-6"
                        >
                          {column.Cell ? column.Cell({ row, value: cellValue }) : (cellValue ?? '-')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Table;