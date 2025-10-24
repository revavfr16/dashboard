import React, { useState } from "react";
import { getIncidentTypeColor, formatDispatchTime } from "../types/dispatch";
import { Incident } from "../types/incident";
import { isOurUnit } from "../utils/api";
import { getUnitStatusFromCallNotes } from "../utils/dispatch-status";

interface DispatchCardProps {
  incident: Incident;
  className?: string;
  onClick?: () => void;
}

const DispatchCard: React.FC<DispatchCardProps> = ({
  incident,
  className = "",
  onClick,
}) => {
  const { dispatch, unitDispatch } = incident;
  const isOurUnitInvolved = isOurUnit(dispatch.unit_codes);
  const isClosed = dispatch.status_code === "closed";
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

  // Helper function to get the latest status for a responder (individual person)
  const getLatestStatus = (unit: any) => {
    if (!unit.statuses || unit.statuses.length === 0) return null;
    // Sort by created_at descending and take the first (most recent)
    const sortedStatuses = [...unit.statuses].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sortedStatuses[0];
  };

  // Helper function to format time from ISO string
  const formatStatusTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div
      className={`border-2 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md ${
        isClosed
          ? "bg-gray-50 dark:bg-gray-800 opacity-75"
          : "bg-white dark:bg-gray-700"
      } ${
        isOurUnitInvolved
          ? "border-blue-500 dark:border-blue-400 hover:border-blue-600 dark:hover:border-blue-300"
          : isClosed
          ? "border-gray-300 dark:border-gray-600"
          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
      } ${className}`}
    >
      <div className="p-4 cursor-pointer" onClick={onClick}>
        <div className="flex gap-4">
          {/* Left side - Main dispatch info */}
          <div className="flex-1">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-3xl font-bold text-black dark:text-white`}
                  >
                    {dispatch.type}
                  </span>
                  {dispatch.box_code && (
                    <div className="px-4 py-2 rounded-xl text-3xl font-black border-4 bg-yellow-400 dark:bg-yellow-500 border-yellow-600 dark:border-yellow-700 text-gray-900 shadow-lg">
                      {dispatch.box_code}
                    </div>
                  )}
                  {isOurUnitInvolved && (
                    <span className="bg-blue-500 text-white px-2 py-1 rounded text-xl">
                      OUR UNITS
                    </span>
                  )}
                </div>
              </div>
              <span className="text-2xl text-gray-500 dark:text-gray-200 ml-2">
                {formatDispatchTime(dispatch.created_at)}
              </span>
            </div>

            <div className="text-2xl text-gray-700 dark:text-gray-100 mb-3">
              <div className="font-medium">{dispatch.address}</div>
              {/* {dispatch.city && dispatch.state_code && (
                <div>
                  {dispatch.city}, {dispatch.state_code}
                </div>
              )} */}
              {dispatch.cross_streets && (
                <div className="text-2xl text-gray-600 dark:text-gray-200 mt-1">
                  Near: {dispatch.cross_streets}
                </div>
              )}
            </div>

            {/* Units Grouped by Status */}
            <div className="mt-3">
              {(() => {
                // If the call is closed, show all units as cleared without status grouping
                if (isClosed) {
                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-xl font-semibold text-gray-700 dark:text-gray-300 min-w-[140px]">
                        Cleared:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {dispatch.unit_codes.map((unit) => {
                          const isOur = isOurUnit([unit]);
                          return (
                            <span
                              key={unit}
                              className={`px-3 py-1.5 rounded-full text-lg font-semibold border bg-gray-500 text-white ${
                                isOur
                                  ? "border-blue-500 dark:border-blue-400"
                                  : "border-gray-500"
                              }`}
                            >
                              {unit}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // Group units by their status
                const unitsByStatus = dispatch.unit_codes.reduce(
                  (groups, unit) => {
                    const isOur = isOurUnit([unit]);
                    const unitStatus = getUnitStatusFromCallNotes(
                      unit,
                      unitDispatch?.call_notes || null,
                      isOur
                    );

                    // Normalize status labels - treat Available and Cleared as the same
                    let normalizedLabel = unitStatus
                      ? unitStatus.label
                      : isOur
                      ? "Dispatched"
                      : "Dispatched";
                    if (normalizedLabel === "Available") {
                      normalizedLabel = "Cleared";
                    }

                    const statusConfig = {
                      key: normalizedLabel,
                      className: unitStatus
                        ? unitStatus.className
                        : "bg-orange-500 text-white",
                      borderClass: unitStatus
                        ? unitStatus.borderClass
                        : "border-orange-500",
                      priority: unitStatus
                        ? normalizedLabel === "Dispatched"
                          ? 1
                          : normalizedLabel === "Enroute" ||
                            normalizedLabel === "Responding"
                          ? 2
                          : normalizedLabel === "On Scene"
                          ? 3
                          : normalizedLabel === "Transport"
                          ? 4
                          : normalizedLabel === "Transport Arrived"
                          ? 5
                          : normalizedLabel === "Cleared"
                          ? 6
                          : 7
                        : 1,
                    };

                    if (!groups[normalizedLabel]) {
                      groups[normalizedLabel] = {
                        units: [],
                        config: statusConfig,
                      };
                    }
                    groups[normalizedLabel].units.push({
                      unit,
                      isOur,
                      unitStatus,
                    });

                    return groups;
                  },
                  {} as Record<
                    string,
                    {
                      units: Array<{
                        unit: string;
                        isOur: boolean;
                        unitStatus: any;
                      }>;
                      config: any;
                    }
                  >
                );

                // Sort status groups by priority (Dispatched -> Enroute -> On Scene -> Transport -> Transport Arrived -> Cleared)
                const sortedStatusGroups = Object.entries(unitsByStatus).sort(
                  ([, a], [, b]) => a.config.priority - b.config.priority
                );

                return (
                  <div className="grid grid-cols-3 gap-3 overflow-hidden">
                    {sortedStatusGroups.slice(0, 6).map(([statusName, group]) => (
                      <div
                        key={statusName}
                        className="flex flex-col gap-1"
                      >
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                          {statusName}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {group.units.map(({ unit }) => (
                            <span
                              key={unit}
                              className={`px-2 py-1 rounded-full text-2xl font-semibold border ${group.config.className} ${group.config.borderClass}`}
                            >
                              {unit}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right side - Responders */}
          {unitDispatch &&
            unitDispatch.units &&
            unitDispatch.units.length > 0 && (
              <div className="w-96 border-l-4 border-gray-300 dark:border-gray-600 pl-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Responders
                </h3>
                <div className="space-y-2">
                  {unitDispatch.units.map((unit) => {
                    const latestStatus = getLatestStatus(unit);
                    return (
                      <div
                        key={unit.id}
                        className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2"
                      >
                        <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                          {unit.name}
                        </div>
                        {latestStatus && (
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-2 py-1 rounded text-sm font-medium ${
                                latestStatus.status_code === "on_scene"
                                  ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                                  : latestStatus.status_code === "enroute" ||
                                    latestStatus.status_code === "responding"
                                  ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200"
                                  : latestStatus.status_code === "complete" ||
                                    latestStatus.status_code === "cancel"
                                  ? "bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
                                  : "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200"
                              }`}
                            >
                              {latestStatus.name}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatStatusTime(latestStatus.created_at)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Expandable Notes Drawer */}
      {unitDispatch?.call_notes && (
        <div className="border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsNotesExpanded(!isNotesExpanded);
            }}
            className="w-full px-4 py-2 flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
              Dispatch Notes
            </span>
            <svg
              className={`w-5 h-5 text-gray-700 dark:text-gray-300 transition-transform ${
                isNotesExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {isNotesExpanded && (
            <div className="px-4 pb-4">
              <div className="max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded p-3 text-lg text-gray-700 dark:text-gray-300">
                {unitDispatch.call_notes.split(/\\n|\n/).map((line, index) => (
                  <div key={index} className="mb-1 last:mb-0">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DispatchCard;
