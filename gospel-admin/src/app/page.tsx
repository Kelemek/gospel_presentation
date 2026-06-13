"use client";

/**
 * Root route shows a brief loading state only. Launch resume (`ProfileAppLaunchResume`
 * in the root layout) routes `/` to the last active profile or `/default` after hydration.
 */
export default function GospelPresentation() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" data-gospel-surface>
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-slate-400 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-slate-300">Redirecting to gospel presentation...</p>
      </div>
    </div>
  );
}
