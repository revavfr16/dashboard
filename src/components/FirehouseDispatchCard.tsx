import React, { useState, useEffect } from "react";
import { Incident } from "../types/incident";
import { isOurUnit } from "../utils/api";
import { getUnitStatusFromCallNotes } from "../utils/dispatch-status";

interface FirehouseDispatchCardProps {
  incident: Incident;
  className?: string;
  onClick?: () => void;
}

const FirehouseDispatchCard: React.FC<FirehouseDispatchCardProps> = ({
  incident,
  className = "",
  onClick,
}) => {
  const { dispatch, unitDispatch } = incident;
  const isOurUnitInvolved = isOurUnit(dispatch.unit_codes);
  const isClosed = dispatch.status_code === "closed";

  // Determine card color - neutral background, blue border if our units
  const bgColor = "bg-gray-900 dark:bg-gray-900";
  const borderColor = isOurUnitInvolved
    ? "border-blue-500 dark:border-blue-400"
    : "border-gray-700 dark:border-gray-700";
  const headerBg = "bg-gray-800 dark:bg-gray-800";

  // Check for fire and EMS units
  const hasFireUnit = dispatch.unit_codes.some((unit) => unit.startsWith("FS"));
  const hasEMSUnit = dispatch.unit_codes.some((unit) => unit.startsWith("ES"));

  // Timer - count up from dispatch time
  const [elapsedTime, setElapsedTime] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const dispatchTime = new Date(dispatch.created_at).getTime();
      const diffMs = now - dispatchTime;

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      if (hours > 0) {
        setElapsedTime(
          `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        );
      } else {
        setElapsedTime(
          `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [dispatch.created_at]);

  return (
    <div
      className={`border-4 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl ${bgColor} ${borderColor} ${className}`}
      onClick={onClick}
    >
      {/* Header with centered timer */}
      <div className={`${headerBg} px-6 py-3 flex justify-center items-center`}>
        <span className="text-4xl font-bold text-white font-mono">
          {elapsedTime}
        </span>
      </div>

      {/* Main content */}
      <div className="p-6">
        <div className="flex gap-6">
          {/* Left side - Main dispatch info */}
          <div className="flex-1">
            {/* Type and Box Code */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl font-black text-gray-900 dark:text-white">
                {dispatch.type}
              </span>
              {dispatch.box_code && (
                <div className="px-6 py-3 rounded-xl text-5xl font-black border-4 bg-yellow-400 dark:bg-yellow-500 border-yellow-600 dark:border-yellow-700 text-gray-900 shadow-lg">
                  {dispatch.box_code}
                </div>
              )}
            </div>

            {/* Address */}
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {dispatch.address}
            </div>
            {dispatch.city && dispatch.state_code && (
              <div className="text-2xl text-gray-700 dark:text-gray-300 mb-1">
                {dispatch.city}, {dispatch.state_code}
              </div>
            )}
            {dispatch.cross_streets && (
              <div className="text-2xl text-gray-600 dark:text-gray-400 mb-4">
                Near: {dispatch.cross_streets}
              </div>
            )}

            {/* Unit Type Indicators - Only show "On Scene" units */}
            <div className="mt-6">
              {(() => {
                // Get only "On Scene" units
                const onSceneUnits = dispatch.unit_codes.filter((unit) => {
                  const isOur = isOurUnit([unit]);
                  const unitStatus = getUnitStatusFromCallNotes(
                    unit,
                    unitDispatch?.call_notes || null,
                    isOur
                  );
                  return unitStatus && unitStatus.label === "On Scene";
                });

                return (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Fire Unit Indicator */}
                    <div className="flex items-center justify-center h-32">
                      {hasFireUnit && (
                        <div className="w-full h-full bg-red-600 dark:bg-red-700 rounded-lg flex items-center justify-center">
                          <span className="text-5xl font-black text-white">
                            FIRE
                          </span>
                        </div>
                      )}
                    </div>

                    {/* EMS Unit Indicator */}
                    <div className="flex items-center justify-center h-32">
                      {hasEMSUnit && (
                        <div className="w-full h-full bg-blue-600 dark:bg-blue-700 rounded-lg flex items-center justify-center">
                          <span className="text-5xl font-black text-white">
                            EMS
                          </span>
                        </div>
                      )}
                    </div>

                    {/* On Scene Units - spanning both columns if present */}
                    {!isClosed && onSceneUnits.length > 0 && (
                      <div className="col-span-2">
                        <div className="text-xl font-bold text-white mb-2">
                          On Scene
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {onSceneUnits.map((unit) => {
                            const isOur = isOurUnit([unit]);
                            const unitStatus = getUnitStatusFromCallNotes(
                              unit,
                              unitDispatch?.call_notes || null,
                              isOur
                            );
                            return (
                              <span
                                key={unit}
                                className={`px-3 py-2 rounded-lg text-2xl font-bold border-2 text-center ${
                                  unitStatus
                                    ? unitStatus.className
                                    : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                                } ${
                                  unitStatus
                                    ? unitStatus.borderClass
                                    : "border-red-300 dark:border-red-600"
                                }`}
                              >
                                {unit}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right side - Responders */}
          {unitDispatch &&
            unitDispatch.units &&
            unitDispatch.units.length > 0 && (
              <div className="w-80 border-l-4 border-gray-300 dark:border-gray-600 pl-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Responders
                </h3>
                <div className="space-y-3">
                  {unitDispatch.units.map((unit) => {
                    const latestStatus =
                      unit.statuses && unit.statuses.length > 0
                        ? [...unit.statuses].sort(
                            (a, b) =>
                              new Date(b.created_at).getTime() -
                              new Date(a.created_at).getTime()
                          )[0]
                        : null;

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
                        key={unit.id}
                        className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3"
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
    </div>
  );
};

export default FirehouseDispatchCard;
