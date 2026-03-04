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
  public_template_order?: string[] | null;
}

interface PublicTemplate {
  slug: string;
  title: string;
}

// ============================================================================
// Admin Settings Page
// ============================================================================

export default function AdminSettingsPage() {
  const [, setSettings] = useState<AdminSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [codeLength, setCodeLength] = useState<number>(6);
  const [expiryMinutes, setExpiryMinutes] = useState<number>(15);

  // Public template order (Resources dropdown)
  const [publicTemplates, setPublicTemplates] = useState<PublicTemplate[]>([]);
  const [orderedTemplates, setOrderedTemplates] = useState<PublicTemplate[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

      // Load core settings first (no public_template_order so page works before migration)
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

      // Load public templates for Resources dropdown order
      const { data: templatesData } = await supabase
        .from("profiles")
        .select("slug, title")
        .eq("is_template", true)
        .eq("is_public", true);

      const templates: PublicTemplate[] = (templatesData || []).map((r: any) => ({
        slug: r.slug,
        title: r.title || r.slug,
      })).sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));

      setPublicTemplates(templates);

      // Load order separately; if column does not exist (migration not run), use empty order
      let orderSlugs: string[] = [];
      try {
        const { data } = await supabase
          .from("admin_settings")
          .select("public_template_order")
          .eq("id", 1)
          .single();
        const orderData = data as { public_template_order?: string[] | null } | null;
        if (orderData?.public_template_order != null && Array.isArray(orderData.public_template_order)) {
          orderSlugs = orderData.public_template_order;
        }
      } catch {
        // Column may not exist yet; ignore
      }

      if (orderSlugs.length > 0) {
        const bySlug = new Map(templates.map((t) => [t.slug, t]));
        const ordered: PublicTemplate[] = [];
        for (const slug of orderSlugs) {
          const t = bySlug.get(slug);
          if (t) {
            ordered.push(t);
            bySlug.delete(slug);
          }
        }
        const rest = Array.from(bySlug.values()).sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
        setOrderedTemplates([...ordered, ...rest]);
      } else {
        setOrderedTemplates(templates);
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

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    setError(null);
    setOrderSuccess(null);
    try {
      const supabase = createClient();
      const slugs = orderedTemplates.map((t) => t.slug);
      const { error: updateError } = await (supabase.from("admin_settings") as any)
        .update({ public_template_order: slugs })
        .eq("id", 1);
      if (updateError) throw updateError;
      setOrderSuccess("Resources order saved.");
      setTimeout(() => setOrderSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save resources order. Please try again.";
      logger.error("Failed to save resources order:", err);
      setError(message);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDragLeave = () => setDragOverIndex(null);
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (dragIndex === null || dragIndex === dropIndex) return;
    const next = [...orderedTemplates];
    const [removed] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, removed);
    setOrderedTemplates(next);
    setDragIndex(null);
  };

  // Grip icon (six dots) for drag handle
  const GripIcon = () => (
    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path d="M7 2a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM7 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM7 18a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM13 2a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM13 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM13 18a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  );

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

          {orderSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-lg shadow-sm" role="alert">
              <p className="text-sm">{orderSuccess}</p>
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

          {/* Resources dropdown order */}
          <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
            <div className="border-b border-slate-200 px-6 sm:px-8 py-6">
              <h2 className="text-2xl font-bold text-slate-900">Resources dropdown order</h2>
              <p className="text-slate-600 text-sm mt-2">
                Order of public templates in the Resources menu on the main page. Drag to reorder.
              </p>
            </div>
            <div className="px-6 sm:px-8 py-6">
              {publicTemplates.length === 0 ? (
                <div className="w-80 border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
                  <div className="px-4 py-3 text-sm text-slate-500">
                    No public templates. Mark templates as public on the Templates page.
                  </div>
                </div>
              ) : (
                <div className="w-80 border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden" role="listbox">
                  {orderedTemplates.map((t, index) => (
                    <div
                      key={t.slug}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm text-slate-700 border-b border-slate-100 last:border-b-0 transition-colors cursor-grab active:cursor-grabbing ${dragOverIndex === index ? "bg-slate-50" : "hover:bg-slate-50"}`}
                      role="option"
                      aria-selected={dragOverIndex === index}
                    >
                      <span className="shrink-0" aria-hidden>
                        <GripIcon />
                      </span>
                      <span className="min-w-0 truncate">{t.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {publicTemplates.length > 0 && (
              <div className="border-t border-slate-200 px-6 sm:px-8 py-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveOrder}
                  disabled={isSavingOrder}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 disabled:opacity-50 disabled:bg-slate-400 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium flex items-center gap-2"
                >
                  {isSavingOrder ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save order"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
