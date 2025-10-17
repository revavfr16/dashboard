import { useState, useEffect } from "react";
import { WeatherData } from "../types/weather";
import { fetchWeatherData } from "../utils/weatherApi";
import { fetchCurrentSchedule, getCurrentlyStaffed } from "../utils/api";
import { StaffedPosition } from "../types/schedule";

interface TodayProps {
  className?: string;
}

const Today: React.FC<TodayProps> = ({ className = "" }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [staffedPositions, setStaffedPositions] = useState<StaffedPosition[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setError(null);

      // Fetch weather and schedule in parallel
      const [weatherData, scheduleData] = await Promise.all([
        fetchWeatherData(),
        fetchCurrentSchedule(),
      ]);

      setWeather(weatherData);
      const staffed = getCurrentlyStaffed(scheduleData);
      setStaffedPositions(staffed);
    } catch (err) {
      setError("Failed to fetch data");
      console.error("Error fetching today data:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string): string => {
    const date = new Date(timeString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatTimeRange = (start: string, end: string): string => {
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  // Group staffed positions by assignment like in Staffing component
  const groupedStaffing = staffedPositions.reduce((groups, position) => {
    const key = position.assignmentName;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(position);
    return groups;
  }, {} as Record<string, StaffedPosition[]>);

  if (loading) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}
      >
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          Today
        </h2>
        <div className="animate-pulse">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}
      >
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          Today
        </h2>
        <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
        <button
          onClick={fetchData}
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col h-full ${className}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Today
        </h2>
        <button
          onClick={fetchData}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          title="Refresh"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {/* Weather Section */}
        {weather && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center">
                  <div className="text-white text-2xl">☀</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800 dark:text-white">
                    {weather.temperature}°F
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Feels like {weather.temperatureFeelsLike}°F
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300 capitalize">
                  {weather.description}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {weather.windSpeed} mph {weather.windDirectionText}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Staffing Section */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              On Duty
            </h3>
            <span className="text-md text-gray-600 dark:text-gray-400">
              {staffedPositions.length} Active
            </span>
          </div>

          {staffedPositions.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
              <div className="text-2xl mb-1">👥</div>
              <div className="text-lg">No one on duty</div>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto">
              {Object.entries(groupedStaffing).map(
                ([assignmentName, positions]) => (
                  <div key={assignmentName} className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      {assignmentName}
                    </h4>
                    {positions.map((position, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded p-3 border-l-4 border-green-400"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-lg text-gray-900 dark:text-white">
                              {position.user.public_name}
                              {position.positionName && (
                                <span className="text-md font-medium text-gray-600 dark:text-gray-300 ml-2">
                                  ({position.positionName})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-2">
                            <div className="text-lg font-medium text-gray-900 dark:text-white">
                              Until {formatTime(position.endTime)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Today;
