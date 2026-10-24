import React from 'react';

/**
 * LoadingSpinner — centered full-area spinner.
 * Optionally accepts a `text` prop for an underneath label.
 */
export default function LoadingSpinner({ text = 'Loading…', fullPage = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${
        fullPage ? 'min-h-screen' : 'py-20'
      }`}
    >
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>
      {text && (
        <p className="text-sm text-gray-400 font-medium">{text}</p>
      )}
    </div>
  );
}
