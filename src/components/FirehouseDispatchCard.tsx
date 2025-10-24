import React, { useState, useEffect } from "react";
import { Incident } from "../types/incident";
import { isOurUnit, fetchUnitsByDispatch } from "../utils/api";
import { getUnitStatusFromCallNotes } from "../utils/dispatch-status";
import { UnitDispatch } from "../types/unit-dispatch";

interface FirehouseDispatchCardProps {
  incident: Incident;
  className?: string;
  onClick?: () => void;
  onAutoClose?: () => void;
  isNewDispatch?: boolean;
}

const FirehouseDispatchCard: React.FC<FirehouseDispatchCardProps> = ({
  incident,
  className = "",
  onClick,
  onAutoClose,
  isNewDispatch = false,
}) => {
  const { dispatch } = incident;
  const [unitDispatch, setUnitDispatch] = useState<UnitDispatch | undefined>(incident.unitDispatch);
  const isOurUnitInvolved = isOurUnit(dispatch.unit_codes);
  const isClosed = dispatch.status_code === "closed";

  // Poll for unit dispatch updates every 10 seconds
  useEffect(() => {
    const refreshUnitDispatch = async () => {
      const updated = await fetchUnitsByDispatch(dispatch.id);
      if (updated) {
        setUnitDispatch(updated);
      }
    };

    // Initial fetch
    refreshUnitDispatch();

    // Set up polling interval
    const interval = setInterval(refreshUnitDispatch, 10000);

    return () => clearInterval(interval);
  }, [dispatch.id]);

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
  const [timeUntilClose, setTimeUntilClose] = useState<number | null>(null);

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

      // Auto-close countdown logic (only for open incidents)
      if (dispatch.status_code === "open") {
        const tenMinutesLater = dispatchTime + (1 * 60 * 1000); // 10 minutes in milliseconds
        const timeLeft = tenMinutesLater - now;
        
        if (timeLeft <= 0) {
          setTimeUntilClose(0);
          // Trigger close after a brief delay
          setTimeout(() => {
            if (onAutoClose) {
              onAutoClose();
            }
          }, 1000);
        } else {
          setTimeUntilClose(timeLeft);
        }
      } else {
        setTimeUntilClose(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [dispatch.created_at, dispatch.status_code, onClick]);

  return (
    <div
      className={`border-4 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl ${bgColor} ${borderColor} ${className}`}
      onClick={onClick}
    >
      {/* Header with centered timer and countdown */}
      <div className={`${headerBg} px-6 py-3 flex justify-between items-center`}>
        <div className="flex-1"></div>
        <span className="text-4xl font-bold text-white font-mono">
          {elapsedTime}
        </span>
        <div className="flex-1 flex justify-end">
          {isNewDispatch && timeUntilClose !== null && timeUntilClose > 0 && (
            <div className="text-right">
              <div className="text-sm text-gray-300">Auto-close in:</div>
              <div className="text-lg font-bold text-yellow-400">
                {Math.floor(timeUntilClose / 60000)}:{(Math.floor(timeUntilClose / 1000) % 60).toString().padStart(2, '0')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="p-8">
        {/* Type and Box Code */}
        <div className="flex items-center gap-6 mb-6">
          <span className="text-8xl font-black text-white drop-shadow-lg">
            {dispatch.type}
          </span>
          {dispatch.box_code && (
            <div className="px-10 py-5 rounded-2xl text-8xl font-black border-8 bg-yellow-400 dark:bg-yellow-500 border-yellow-700 dark:border-yellow-800 text-gray-900 shadow-2xl">
              {dispatch.box_code}
            </div>
          )}
        </div>

        {/* Address */}
        <div className="text-6xl font-black text-white drop-shadow-lg mb-4">
          {dispatch.address} {dispatch.city && dispatch.state_code ? `, ${dispatch.city}, ${dispatch.state_code}` : ""}
        </div>
        {dispatch.cross_streets && (
          <div className="text-5xl font-bold text-gray-600 dark:text-gray-300 mb-6">
            Near: {dispatch.cross_streets}
          </div>
        )}

        {/* Unit Type Indicators - Only show "On Scene" units */}
        <div className="mt-8">
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
              <div className="grid grid-cols-2 gap-6">
                {/* Fire Unit Indicator */}
                <div className="flex items-center justify-center h-48">
                  {hasFireUnit && (
                    <div className="w-full h-full bg-red-600 dark:bg-red-700 rounded-2xl flex items-center justify-center shadow-2xl border-4 border-red-800">
                      <span className="text-8xl font-black text-white drop-shadow-lg">
                        FIRE
                      </span>
                    </div>
                  )}
                </div>

                {/* EMS Unit Indicator */}
                <div className="flex items-center justify-center h-48">
                  {hasEMSUnit && (
                    <div className="w-full h-full bg-blue-600 dark:bg-blue-700 rounded-2xl flex items-center justify-center shadow-2xl border-4 border-blue-800">
                      <span className="text-8xl font-black text-white drop-shadow-lg">
                        EMS
                      </span>
                    </div>
                  )}
                </div>

                {/* On Scene Units - spanning both columns if present */}
                {!isClosed && onSceneUnits.length > 0 && (
                  <div className="col-span-2">
                    <div className="text-4xl font-black text-white mb-4 drop-shadow-lg">
                      On Scene
                    </div>
                    <div className="grid grid-cols-3 gap-4">
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
                            className={`px-6 py-4 rounded-2xl text-4xl font-black border-4 text-center drop-shadow-lg ${
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

      {/* Responders Section at Bottom */}
      {unitDispatch &&
        unitDispatch.units &&
        unitDispatch.units.length > 0 && (
          <div className="border-t-4 border-gray-700 dark:border-gray-700 bg-gray-800 dark:bg-gray-800 p-6">
            <h3 className="text-5xl font-black text-white mb-6 drop-shadow-lg">
              Responders
            </h3>
            <div className="flex flex-wrap gap-4">
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
                    className="bg-gray-700 dark:bg-gray-700 rounded-xl p-3 border-4 border-gray-600 shadow-lg flex items-center gap-3"
                  >
                    <span className="text-4xl font-black text-white whitespace-nowrap">
                      {unit.name}
                    </span>
                    {latestStatus && (
                      <>
                        <span
                          className={`px-3 py-1 rounded-lg text-lg font-bold uppercase whitespace-nowrap ${
                            latestStatus.status_code === "on_scene"
                              ? "bg-green-600 text-white"
                              : latestStatus.status_code === "enroute" ||
                                latestStatus.status_code === "responding"
                              ? "bg-yellow-500 text-gray-900"
                              : latestStatus.status_code === "complete" ||
                                latestStatus.status_code === "cancel"
                              ? "bg-gray-600 text-white"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {latestStatus.name}
                        </span>
                        <span className="text-base font-bold text-gray-300 whitespace-nowrap">
                          {formatStatusTime(latestStatus.created_at)}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
    </div>
  );
};

export default FirehouseDispatchCard;
