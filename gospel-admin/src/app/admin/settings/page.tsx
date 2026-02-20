"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface AdminSettings {
  id: number;
  verification_code_length: number;
  verification_code_expiry_minutes: number;
  enable_verification_code_login: boolean;
}

// ============================================================================
// Admin Settings Page
// ============================================================================

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [codeLength, setCodeLength] = useState<number>(6);
  const [expiryMinutes, setExpiryMinutes] = useState<number>(15);

  // ============================================================================
  // Load Settings
  // ============================================================================

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from("admin_settings")
        .select("verification_code_length, verification_code_expiry_minutes, enable_verification_code_login")
        .eq("id", 1)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setSettings(data as any);
        setCodeLength((data as any).verification_code_length || 6);
        setExpiryMinutes((data as any).verification_code_expiry_minutes || 15);
      }
    } catch (err) {
      logger.error("Failed to load admin settings:", err);
      setError("Failed to load settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // Save Settings
  // ============================================================================

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();

      // Type assertion to bypass Supabase type inference limitations
      const updateData = {
        verification_code_length: codeLength,
        verification_code_expiry_minutes: expiryMinutes,
      };

      const { error: updateError } = await (supabase
        .from("admin_settings") as any)
        .update(updateData)
        .eq("id", 1);

      if (updateError) {
        throw updateError;
      }

      setSuccess("Settings saved successfully!");
      logger.info("Admin settings updated");

      // Reload settings to confirm
      await loadSettings();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      logger.error("Failed to save admin settings:", err);
      setError("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="bg-white rounded-xl shadow-md border border-slate-100 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-pulse text-slate-600">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                System Settings
              </h1>
              <p className="text-slate-600">
                Configure system-wide authentication and security settings
              </p>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium w-fit"
            >
              ← Back
            </Link>
          </div>
        </div>

        {/* Alerts */}
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg shadow-sm" role="alert">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-lg shadow-sm" role="alert">
              <p className="font-semibold">Success</p>
              <p className="text-sm mt-1">{success}</p>
            </div>
          )}

          {/* Verification Code Authentication Settings */}
          <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
            <div className="border-b border-slate-200 px-6 sm:px-8 py-6">
              <h2 className="text-2xl font-bold text-slate-900">Verification Code Authentication</h2>
              <p className="text-slate-600 text-sm mt-2">
                Configure email-based verification code login as an alternative to magic links.
              </p>
            </div>

            <div className="px-6 sm:px-8 py-6 space-y-6">
              {/* Code Length */}
              <div>
                <label htmlFor="code-length" className="block text-base font-semibold text-slate-900 mb-2">
                  Verification Code Length
                </label>
                <p className="text-slate-600 text-sm mb-4">
                  Number of digits in the verification code. Longer codes are more secure but harder to type.
                </p>
                <select
                  id="code-length"
                  value={codeLength}
                  onChange={(e) => setCodeLength(Number(e.target.value))}
                  disabled={isSaving}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500 appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-size-[1.25rem] bg-position-[right_0.75rem_center] bg-no-repeat pr-10"
                >
                  <option value={4}>4 digits</option>
                  <option value={6}>6 digits (recommended)</option>
                  <option value={8}>8 digits</option>
                </select>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200" />

              {/* Expiry Time */}
              <div>
                <label htmlFor="expiry-minutes" className="block text-base font-semibold text-slate-900 mb-2">
                  Code Expiry Time
                </label>
                <p className="text-slate-600 text-sm mb-4">
                  How long verification codes remain valid after being sent. Shorter times are more secure.
                </p>
                <select
                  id="expiry-minutes"
                  value={expiryMinutes}
                  onChange={(e) => setExpiryMinutes(Number(e.target.value))}
                  disabled={isSaving}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500 appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-size-[1.25rem] bg-position-[right_0.75rem_center] bg-no-repeat pr-10"
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes (recommended)</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200" />
            </div>

            {/* Action Buttons */}
            <div className="border-t border-slate-200 px-6 sm:px-8 py-6 flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 disabled:opacity-50 disabled:bg-slate-400 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
