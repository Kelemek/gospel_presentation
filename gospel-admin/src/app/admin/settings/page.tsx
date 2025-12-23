"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminHeader from "@/components/AdminHeader";
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
  const [enableLogin, setEnableLogin] = useState<boolean>(false);

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
        setEnableLogin((data as any).enable_verification_code_login || false);
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
        enable_verification_code_login: enableLogin,
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
      <div>
        <AdminHeader
          title="System Settings"
          description="Configure system-wide authentication and security settings"
        />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="bg-white rounded-xl shadow-md border border-slate-100 p-8">
              <div className="flex items-center justify-center">
                <div className="animate-pulse text-slate-600">Loading...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div>
      <AdminHeader
        title="System Settings"
        description="Configure system-wide authentication and security settings"
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {/* Alerts */}
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
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
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
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
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

              {/* Enable Login Toggle */}
              <div className="flex justify-between items-start gap-6">
                <div className="flex-1">
                  <label className="block text-base font-semibold text-slate-900 mb-1">
                    Enable Verification Code Login
                  </label>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Activate verification code authentication for users. Ensure all configuration above is correct before enabling.
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-3">
                  <button
                    onClick={() => setEnableLogin(!enableLogin)}
                    disabled={isSaving}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${
                      enableLogin
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-slate-300 hover:bg-slate-400'
                    } disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}
                  >
                    <div
                      className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                        enableLogin ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm font-semibold text-slate-900 min-w-20">
                    {enableLogin ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-slate-200 px-6 sm:px-8 py-6 flex justify-end gap-3">
              <button
                onClick={loadSettings}
                disabled={isSaving}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 disabled:opacity-50 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                Reset
              </button>
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

          {/* Information Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 sm:px-8 py-6 flex items-start gap-4 border-b border-slate-200">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-base font-semibold text-slate-900">Setup Requirements</h3>
            </div>
            <div className="px-6 sm:px-8 py-6">
              <p className="text-slate-700 text-sm mb-4">Before enabling verification code login, ensure you have:</p>
              <ul className="text-slate-700 text-sm space-y-2 mb-4">
                <li className="flex gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Run the database migration: <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">20251223_create_verification_codes.sql</code></span>
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Deployed Supabase Edge Functions: <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">send-email</code>, <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">send-verification-code</code>, <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">verify-code</code></span>
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-400">•</span>
                  <span>
                    Configured Microsoft Graph API credentials in Supabase Edge Function secrets:
                    <ul className="text-slate-700 text-sm space-y-1 mt-2 ml-4">
                      <li className="flex gap-2">
                        <span className="text-slate-400">◦</span>
                        <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">MICROSOFT_GRAPH_TENANT_ID</code>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-slate-400">◦</span>
                        <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">MICROSOFT_GRAPH_CLIENT_ID</code>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-slate-400">◦</span>
                        <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">MICROSOFT_GRAPH_CLIENT_SECRET</code>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-slate-400">◦</span>
                        <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">EMAIL_FROM_ADDRESS</code>
                      </li>
                    </ul>
                  </span>
                </li>
              </ul>
              <p className="text-slate-600 text-xs italic">
                See the documentation for detailed setup instructions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
