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
        <div className="container">
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading settings...</p>
          </div>
        </div>
        <style jsx>{`
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 32px 24px;
          }

          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            padding: 64px 24px;
            color: #718096;
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e2e8f0;
            border-top-color: #3182ce;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      <AdminHeader
        title="System Settings"
        description="Configure system-wide authentication and security settings"
      />

      <div className="container">
        {/* Alerts */}
        {error && (
          <div className="alert alert-error" role="alert">
            <svg className="alert-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="alert">
            <svg className="alert-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {success}
          </div>
        )}

        {/* Verification Code Authentication Settings */}
        <div className="settings-card">
          <div className="card-header">
            <h2 className="card-title">Verification Code Authentication</h2>
            <p className="card-description">
              Configure email-based verification code login as an alternative to magic links.
              Users can access this via <a href="/login-code" target="_blank">/login-code</a>
            </p>
          </div>

          <div className="card-body">
            {/* Enable/Disable Toggle */}
            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label" htmlFor="enable-login">
                  Enable Verification Code Login
                </label>
                <p className="setting-description">
                  When enabled, users can log in using verification codes sent to their email
                  instead of magic links.
                </p>
              </div>
              <div className="toggle-container">
                <button
                  id="enable-login"
                  role="switch"
                  aria-checked={enableLogin}
                  onClick={() => setEnableLogin(!enableLogin)}
                  className={`toggle ${enableLogin ? "toggle-on" : "toggle-off"}`}
                  disabled={isSaving}
                >
                  <span className="toggle-slider" />
                </button>
                <span className="toggle-label">{enableLogin ? "Enabled" : "Disabled"}</span>
              </div>
            </div>

            <div className="divider" />

            {/* Code Length */}
            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label" htmlFor="code-length">
                  Verification Code Length
                </label>
                <p className="setting-description">
                  Number of digits in the verification code. Longer codes are more secure but
                  harder to type.
                </p>
              </div>
              <div className="input-container">
                <select
                  id="code-length"
                  value={codeLength}
                  onChange={(e) => setCodeLength(Number(e.target.value))}
                  disabled={isSaving}
                  className="select-input"
                >
                  <option value={4}>4 digits</option>
                  <option value={6}>6 digits (recommended)</option>
                  <option value={8}>8 digits</option>
                </select>
              </div>
            </div>

            <div className="divider" />

            {/* Expiry Time */}
            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label" htmlFor="expiry-minutes">
                  Code Expiry Time
                </label>
                <p className="setting-description">
                  How long verification codes remain valid after being sent. Shorter times are
                  more secure.
                </p>
              </div>
              <div className="input-container">
                <select
                  id="expiry-minutes"
                  value={expiryMinutes}
                  onChange={(e) => setExpiryMinutes(Number(e.target.value))}
                  disabled={isSaving}
                  className="select-input"
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes (recommended)</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="card-footer">
            <button
              onClick={loadSettings}
              disabled={isSaving}
              className="btn btn-secondary"
            >
              Reset
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="btn btn-primary"
            >
              {isSaving ? (
                <>
                  <div className="spinner" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>

        {/* Information Card */}
        <div className="info-card">
          <div className="info-header">
            <svg className="info-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3>Setup Requirements</h3>
          </div>
          <div className="info-body">
            <p>Before enabling verification code login, ensure you have:</p>
            <ul className="info-list">
              <li>Run the database migration: <code>20251223_create_verification_codes.sql</code></li>
              <li>Deployed Supabase Edge Functions: <code>send-email</code>, <code>send-verification-code</code>, <code>verify-code</code></li>
              <li>
                Configured Microsoft Graph API credentials in Supabase Edge Function secrets:
                <ul>
                  <li><code>MICROSOFT_GRAPH_TENANT_ID</code></li>
                  <li><code>MICROSOFT_GRAPH_CLIENT_ID</code></li>
                  <li><code>MICROSOFT_GRAPH_CLIENT_SECRET</code></li>
                  <li><code>EMAIL_FROM_ADDRESS</code></li>
                </ul>
              </li>
            </ul>
            <p className="info-note">
              See the documentation for detailed setup instructions.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .alert {
          padding: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .alert-error {
          background-color: #fff5f5;
          border: 1px solid #fc8181;
          color: #c53030;
        }

        .alert-success {
          background-color: #f0fff4;
          border: 1px solid #68d391;
          color: #2f855a;
        }

        .alert-icon {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }

        .settings-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .card-header {
          padding: 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .card-title {
          font-size: 20px;
          font-weight: 600;
          color: #1a202c;
          margin: 0 0 8px 0;
        }

        .card-description {
          font-size: 14px;
          color: #718096;
          margin: 0;
        }

        .card-description a {
          color: #3182ce;
          text-decoration: underline;
        }

        .card-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
        }

        .setting-info {
          flex: 1;
        }

        .setting-label {
          font-size: 16px;
          font-weight: 600;
          color: #2d3748;
          display: block;
          margin-bottom: 4px;
        }

        .setting-description {
          font-size: 14px;
          color: #718096;
          margin: 0;
          line-height: 1.5;
        }

        .divider {
          height: 1px;
          background-color: #e2e8f0;
        }

        .toggle-container {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .toggle {
          position: relative;
          width: 52px;
          height: 28px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
        }

        .toggle-off {
          background-color: #cbd5e0;
        }

        .toggle-on {
          background-color: #48bb78;
        }

        .toggle:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toggle-slider {
          position: absolute;
          top: 2px;
          width: 24px;
          height: 24px;
          background-color: white;
          border-radius: 50%;
          transition: all 0.3s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        .toggle-off .toggle-slider {
          left: 2px;
        }

        .toggle-on .toggle-slider {
          left: 26px;
        }

        .toggle-label {
          font-size: 14px;
          font-weight: 600;
          color: #2d3748;
          min-width: 70px;
        }

        .input-container {
          flex-shrink: 0;
        }

        .select-input {
          padding: 8px 12px;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
          color: #2d3748;
          background-color: white;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 180px;
        }

        .select-input:focus {
          outline: none;
          border-color: #3182ce;
          box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
        }

        .select-input:disabled {
          background-color: #edf2f7;
          cursor: not-allowed;
        }

        .card-footer {
          padding: 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-primary {
          background-color: #3182ce;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #2c5282;
        }

        .btn-primary:disabled {
          background-color: #a0aec0;
          cursor: not-allowed;
        }

        .btn-secondary {
          background-color: #edf2f7;
          color: #2d3748;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #e2e8f0;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .info-card {
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }

        .info-header {
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          background-color: #edf2f7;
          border-bottom: 1px solid #e2e8f0;
        }

        .info-icon {
          width: 24px;
          height: 24px;
          color: #3182ce;
        }

        .info-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #2d3748;
          margin: 0;
        }

        .info-body {
          padding: 24px;
        }

        .info-body p {
          font-size: 14px;
          color: #4a5568;
          margin: 0 0 16px 0;
        }

        .info-list {
          margin: 0 0 16px 0;
          padding-left: 24px;
          font-size: 14px;
          color: #4a5568;
        }

        .info-list li {
          margin-bottom: 8px;
        }

        .info-list ul {
          margin-top: 8px;
          padding-left: 24px;
        }

        .info-list code {
          background-color: #edf2f7;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: "Courier New", monospace;
          font-size: 13px;
          color: #2d3748;
        }

        .info-note {
          font-size: 13px;
          color: #718096;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .setting-row {
            flex-direction: column;
            gap: 12px;
          }

          .toggle-container {
            align-self: flex-start;
          }

          .select-input {
            min-width: auto;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
