import { useState, useEffect, useCallback, useRef } from "react";
import { Incident } from "../types/incident";
import { getIncidentPage, isOurUnit, getConfiguredUnits, saveConfiguredUnits } from "../utils/api";
import DispatchCard from "./DispatchCard";
import FirehouseDispatchModal from "./FirehouseDispatchModal";
import TestDispatchModal from "./TestDispatchModal";
import UnitConfigModal from "./UnitConfigModal";

interface ActiveDispatchesProps {
  className?: string;
}

// Helper function to format date for FirstDue API
const formatDateForFirstDue = (date: Date): string => {
  return date.toISOString().split(".")[0] + "Z";
};

// Function to play notification sound for new dispatches
const playNotificationSound = () => {
  try {
    // Create a simple notification tone using Web Audio API
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Create a two-tone alert sound
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.3
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log("Could not play notification sound:", error);
  }
};

const ActiveDispatches: React.FC<ActiveDispatchesProps> = ({
  className = "",
}) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("soundNotifications") !== "false"; // Default to enabled
  });
  const previousIncidentIds = useRef<Set<number>>(new Set());
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewDispatch, setIsNewDispatch] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Check if we're using mock data
  const isUsingMockData = import.meta.env.VITE_USE_MOCK_DATA === "true";

  // Modal handlers
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedIncident(null);
    setIsNewDispatch(false);
  }, []);

  const openIncidentModal = useCallback(
    (incident: Incident, isNew = false) => {
      setSelectedIncident(incident);
      setIsNewDispatch(isNew);
      setIsModalOpen(true);
    },
    []
  );

  // Background loading function to silently fetch remaining pages
  const loadRemainingPagesInBackground = useCallback(
    async (startUrl: string, since: string) => {
      let currentUrl: string | undefined = startUrl;

      while (currentUrl) {
        try {
          // Add a small delay to not overwhelm the API
          await new Promise((resolve) => setTimeout(resolve, 500));

          const result = await getIncidentPage(currentUrl, since);

          // Silently merge the new incidents with existing ones
          setIncidents((prev) => mergeIncidents(prev, result.incidents));

          currentUrl = result.nextPageUrl;

          if (!result.hasMore) {
            break;
          }
        } catch (err) {
          console.error("Error loading background page:", err);
          break;
        }
      }
    },
    []
  );

  // Helper function to intelligently merge incidents
  const mergeIncidents = (
    existingIncidents: Incident[],
    newIncidents: Incident[]
  ): Incident[] => {
    const existingMap = new Map(
      existingIncidents.map((incident) => [incident.dispatch.id, incident])
    );
    const mergedIncidents: Incident[] = [];

    // Process new incidents
    for (const newIncident of newIncidents) {
      const existingIncident = existingMap.get(newIncident.dispatch.id);

      if (existingIncident) {
        // If incident already exists
        if (
          existingIncident.dispatch.status_code === "closed" &&
          newIncident.dispatch.status_code === "closed"
        ) {
          // Keep existing closed incident data (already complete)
          mergedIncidents.push(existingIncident);
        } else {
          // Use new data for open incidents or status changes
          mergedIncidents.push(newIncident);
        }
        // Mark as processed
        existingMap.delete(newIncident.dispatch.id);
      } else {
        // New incident, add it
        mergedIncidents.push(newIncident);
      }
    }

    // Add any remaining existing incidents that weren't in the new fetch
    // (this handles cases where older incidents might not be in the latest API response)
    for (const [_, incident] of existingMap) {
      mergedIncidents.push(incident);
    }

    // Sort by creation time (newest first)
    return mergedIncidents.sort(
      (a, b) =>
        new Date(b.dispatch.created_at).getTime() -
        new Date(a.dispatch.created_at).getTime()
    );
  };

  const fetchFirstPage = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching incidents...");
      // Get incidents from last 24 hours
      const since24HoursAgo = formatDateForFirstDue(
        new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
      const result = await getIncidentPage(undefined, since24HoursAgo);
      console.log("Received result:", result);
      console.log("Number of incidents:", result.incidents.length);

      // Intelligently merge with existing incidents
      setIncidents((prev) => mergeIncidents(prev, result.incidents));

      // If there are more pages, start loading them in the background
      if (result.hasMore && result.nextPageUrl) {
        loadRemainingPagesInBackground(result.nextPageUrl, since24HoursAgo);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch dispatches";
      setError(errorMessage);
      console.error("Error fetching dispatches:", err);
    } finally {
      setLoading(false);
    }
  };

  // Effect to detect new incidents and play notification sound
  useEffect(() => {
    console.log(
      "Incidents updated:",
      incidents.length,
      "Previous IDs:",
      previousIncidentIds.current.size,
      "Sound enabled:",
      soundEnabled
    );

    if (incidents.length === 0) return; // Skip on initial load

    const currentIds = new Set(
      incidents.map((incident) => incident.dispatch.id)
    );
    const newIncidents = incidents.filter(
      (incident) =>
        !previousIncidentIds.current.has(incident.dispatch.id) &&
        incident.dispatch.status_code === "open" // Only alert for open/active calls
    );

    console.log(
      "New incidents found:",
      newIncidents.length,
      newIncidents.map((i) => i.dispatch.id)
    );

    // Check for brand new dispatches with our units
    const newOurUnitDispatches = newIncidents.filter(
      (incident) =>
        isOurUnit(incident.dispatch.unit_codes) &&
        incident.dispatch.status_code === "open"
    );

    if (
      newOurUnitDispatches.length > 0 &&
      previousIncidentIds.current.size > 0
    ) {
      // Show modal for the first new dispatch with our units
      const newDispatch = newOurUnitDispatches[0];
      console.log(
        "New dispatch with our units detected:",
        newDispatch.dispatch.id
      );
      openIncidentModal(newDispatch, true);
    }

    if (
      newIncidents.length > 0 &&
      previousIncidentIds.current.size > 0 &&
      soundEnabled
    ) {
      console.log(`Playing sound for ${newIncidents.length} new dispatch(es)`);
      playNotificationSound();
    }

    previousIncidentIds.current = currentIds;
  }, [incidents, soundEnabled]);

  useEffect(() => {
    fetchFirstPage();
    // Refresh first page every 30 seconds
    const interval = setInterval(fetchFirstPage, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && incidents.length === 0) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}
      >
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          Dispatches
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-red-500 ${className}`}
      >
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          Dispatches
        </h2>
        <div className="text-center py-8">
          <div className="text-red-600 dark:text-red-400 text-lg mb-4">
            🚨 Connection Error
          </div>
          <div className="text-red-600 dark:text-red-400 mb-4 max-w-md mx-auto">
            {error}
          </div>
          <div className="space-y-2">
            <button
              onClick={() => fetchFirstPage()}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mr-2"
            >
              Try Again
            </button>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-4">
              • Check your internet connection
              <br />• Contact your system administrator if the problem persists
            </div>
          </div>
        </div>
      </div>
    );
  }

  const openIncidents = incidents
    .filter(({ dispatch }) => dispatch.status_code === "open")
    .sort((a, b) => {
      // Sort our units first, then by creation time (newest first)
      const aIsOurs = isOurUnit(a.dispatch.unit_codes);
      const bIsOurs = isOurUnit(b.dispatch.unit_codes);

      if (aIsOurs && !bIsOurs) return -1;
      if (!aIsOurs && bIsOurs) return 1;

      // Both are ours or both are not ours, sort by time (newest first)
      return (
        new Date(b.dispatch.created_at).getTime() -
        new Date(a.dispatch.created_at).getTime()
      );
    });

  const closedIncidents = incidents.filter(
    ({ dispatch }) => dispatch.status_code === "closed"
  );

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col ${className}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Dispatches
        </h2>
        <div className="flex items-center space-x-2">
          {incidents.length > 0 && (
            <>
              {openIncidents.length > 0 && (
                <span className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 px-2 py-1 rounded-full text-xs font-medium">
                  {openIncidents.length} Dispatched
                </span>
              )}
              {closedIncidents.length > 0 && (
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium">
                  {closedIncidents.length} Recent
                </span>
              )}
            </>
          )}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="p-1 rounded text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            title="Configure units"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={() => {
              const newSoundEnabled = !soundEnabled;
              setSoundEnabled(newSoundEnabled);
              localStorage.setItem(
                "soundNotifications",
                newSoundEnabled.toString()
              );
            }}
            className={`p-1 rounded ${
              soundEnabled
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-400 dark:text-gray-600"
            } hover:text-gray-700 dark:hover:text-gray-200`}
            title={
              soundEnabled
                ? "Disable sound notifications"
                : "Enable sound notifications"
            }
          >
            {soundEnabled ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              console.log("Testing sound...");
              playNotificationSound();
            }}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded"
            title="Test sound"
          >
            Test
          </button>
          {isUsingMockData && (
            <button
              onClick={() => setIsTestModalOpen(true)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs px-2 py-1 border border-blue-300 dark:border-blue-600 rounded bg-blue-50 dark:bg-blue-900/20"
              title="Create test dispatch"
            >
              Test Dispatch
            </button>
          )}
          <button
            onClick={() => fetchFirstPage()}
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
      </div>

      {incidents.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-2xl mb-2">✅</div>
            <div>No active dispatches</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {/* Open Incidents */}
            <div className="space-y-4 mb-6">
              {openIncidents.map((incident) => (
                <DispatchCard
                  key={incident.dispatch.id}
                  incident={incident}
                  onClick={() => openIncidentModal(incident)}
                />
              ))}
            </div>

            {/* Divider
            {closedIncidents.length > 0 && (
              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                <span className="px-4 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900">
                  Recently Closed
                </span>
                <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
              </div>
            )}

            Closed Incidents
            <div className="space-y-4">
              {closedIncidents.map((incident) => (
                <DispatchCard
                  key={incident.dispatch.id}
                  incident={incident}
                  onClick={() => openIncidentModal(incident)}
                />
              ))}
            </div> */}
          </div>
        </div>
      )}

      {/* Incident Modal */}
      <FirehouseDispatchModal
        incident={selectedIncident}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        isNewDispatch={isNewDispatch}
      />

      {/* Test Dispatch Modal */}
      <TestDispatchModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />

      {/* Unit Configuration Modal */}
      <UnitConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        selectedUnits={getConfiguredUnits()}
        onSave={(units) => {
          saveConfiguredUnits(units);
          // Refresh to apply new filter
          fetchFirstPage();
        }}
      />
    </div>
  );
};

export default ActiveDispatches;
