import React, { useEffect } from "react";
import { Incident } from "../types/incident";
import FirehouseDispatchCard from "./FirehouseDispatchCard";

interface FirehouseDispatchModalProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
  isNewDispatch?: boolean;
}

const FirehouseDispatchModal: React.FC<FirehouseDispatchModalProps> = ({
  incident,
  isOpen,
  onClose,
  isNewDispatch = false,
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !incident) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-7xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-6 h-6 text-gray-600 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* New dispatch indicator */}
        {isNewDispatch && (
          <div className="mb-4 bg-red-600 text-white px-6 py-4 rounded-xl text-3xl font-bold text-center shadow-xl animate-pulse">
            🚨 NEW DISPATCH 🚨
          </div>
        )}

        {/* Firehouse dispatch card */}
        <FirehouseDispatchCard incident={incident} />
      </div>
    </div>
  );
};

export default FirehouseDispatchModal;
