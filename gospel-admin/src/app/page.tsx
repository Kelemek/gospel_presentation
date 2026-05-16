"use client";

import { useEffect } from "react";

export default function GospelPresentation() {
  useEffect(() => {
    window.location.href = "/default";
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-slate-400 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-slate-300">Redirecting to gospel presentation...</p>
      </div>
    </div>
  );
}
