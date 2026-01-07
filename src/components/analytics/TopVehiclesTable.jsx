// Top Vehicles Table Component
// Shows most frequently registered vehicles
// Fully responsive with mobile-friendly layout

import React from 'react';

const TopVehiclesTable = ({ topVehicles }) => {
  if (!topVehicles || topVehicles.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Vehicles</h3>
        <div className="flex items-center justify-center h-32 text-gray-500">
          <div className="text-center">
            <p>No vehicle data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Most Frequent Vehicles</h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          Vehicles with most registrations in selected period
        </p>
      </div>

      {/* Mobile view - Cards */}
      <div className="block sm:hidden space-y-2">
        {topVehicles.map((vehicle, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                {index + 1}
              </div>
              <div>
                <p className="font-mono font-medium text-gray-900">{vehicle.reg}</p>
                <p className="text-xs text-gray-500">
                  {vehicle.count} {vehicle.count === 1 ? 'visit' : 'visits'}
                </p>
              </div>
            </div>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-blue-600">
                    {((vehicle.count / topVehicles[0].count) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-200 w-20">
                <div
                  style={{
                    width: `${(vehicle.count / topVehicles[0].count) * 100}%`,
                  }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600"
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop view - Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle (Masked)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Visits
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Frequency
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {topVehicles.map((vehicle, index) => (
              <tr key={index} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                    {index + 1}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-mono font-medium text-gray-900">
                    {vehicle.reg}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{vehicle.count}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[200px]">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(vehicle.count / topVehicles[0].count) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 min-w-[40px] text-right">
                      {((vehicle.count / topVehicles[0].count) * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Privacy Notice */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex gap-2">
          <svg
            className="h-5 w-5 text-gray-400 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-xs text-gray-600">
            Vehicle registrations are partially masked for privacy. Only the first 3 characters are shown.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TopVehiclesTable;
