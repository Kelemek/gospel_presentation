"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import type { ResourceOrderItem } from "@/lib/types";
import { parseResourceOrder, isResourceOrderItemSpurgeonLibrary } from "@/lib/types";
import { isSpurgeonSermonProfileSlug } from "@/lib/spurgeon/sortBySpurgeonSermonSlug";
import { restoreNewProfileFromBackupFile } from "@/lib/createProfileFromBackup";
import { useAlertModal } from "@/contexts/AlertModalContext";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface AdminSettings {
  id: number;
  verification_code_length: number;
  verification_code_expiry_minutes: number;
  enable_verification_code_login: boolean;
  public_template_order?: unknown;
}

interface PublicTemplate {
  slug: string;
  title: string;
}

// ============================================================================
// Admin Settings Page
// ============================================================================

export default function AdminSettingsPage() {
  const router = useRouter();
  const { showAlert } = useAlertModal();
  const [, setSettings] = useState<AdminSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "counselor" | "counselee" | null>(null);

  // Form state
  const [codeLength, setCodeLength] = useState<number>(6);
  const [expiryMinutes, setExpiryMinutes] = useState<number>(15);

  // Resources dropdown order (categories + top-level templates)
  const [publicTemplates, setPublicTemplates] = useState<PublicTemplate[]>([]);
  const [orderItems, setOrderItems] = useState<ResourceOrderItem[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  type DragSource =
    | { kind: "top-level"; index: number }
    | { kind: "template"; slug: string; topLevelIndex?: number; categoryId?: string; indexInCategory?: number };
  type DropTarget =
    | { kind: "top-level"; index: number }
    | { kind: "category"; categoryId: string; indexInCategory?: number };
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

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

      const { data: authData } = await supabase.auth.getUser();
      let resolvedRole: "admin" | "counselor" | "counselee" | null = null;
      if (authData?.user) {
        const { data: userProfile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();
        resolvedRole = ((userProfile as { role?: string } | null)?.role || "counselor") as
          | "admin"
          | "counselor"
          | "counselee";
      }
      setUserRole(resolvedRole);

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

      // Load Resources order (categories + templates, new format only)
      try {
        const { data } = await supabase
          .from("admin_settings")
          .select("public_template_order")
          .eq("id", 1)
          .single();
        const raw = (data as { public_template_order?: unknown } | null)?.public_template_order;
        setOrderItems(parseResourceOrder(raw));
      } catch {
        setOrderItems([]);
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
      const { error: updateError } = await (supabase.from("admin_settings") as any)
        .update({ public_template_order: orderItems })
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

  const handleCreateFromBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsRestoringBackup(true);
    setError(null);
    try {
      const result = await restoreNewProfileFromBackupFile(file);
      showAlert(result.message);
      router.push(`/admin/profiles/${result.newSlug}/content`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to restore backup";
      setError(`Restore failed: ${msg}`);
      showAlert(`Restore failed: ${msg}`);
    } finally {
      setIsRestoringBackup(false);
      event.target.value = "";
    }
  };

  const handleDragStartTopLevel = (index: number) => {
    const item = orderItems[index];
    if (item.type === "template") {
      setDragSource({ kind: "template", slug: item.slug, topLevelIndex: index });
    } else {
      setDragSource({ kind: "top-level", index });
    }
  };

  const hasSpurgeonLibraryRow = orderItems.some((i) => isResourceOrderItemSpurgeonLibrary(i));

  const addSpurgeonLibraryRow = () => {
    if (hasSpurgeonLibraryRow) return;
    setOrderItems((prev) => [...prev, { type: "spurgeonLibrary", title: "Spurgeon sermons" }]);
  };

  const updateSpurgeonLibraryTitle = (index: number, title: string) => {
    setOrderItems((prev) =>
      prev.map((item, i) =>
        i === index && isResourceOrderItemSpurgeonLibrary(item) ? { ...item, title } : item
      )
    );
  };
  const handleDragStartCategoryTemplate = (e: React.DragEvent, categoryId: string, slug: string, indexInCategory: number) => {
    e.stopPropagation();
    setDragSource({ kind: "template", slug, categoryId, indexInCategory });
  };
  const handleDragEnd = () => {
    setDragSource(null);
    setDropTarget(null);
  };
  const handleDragOverTopLevel = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragSource?.kind === "top-level") setDropTarget({ kind: "top-level", index });
    else if (dragSource?.kind === "template") setDropTarget({ kind: "top-level", index });
  };
  const handleDragOverCategoryHeader = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragSource?.kind === "template") setDropTarget({ kind: "category", categoryId });
  };
  const handleDragOverCategoryTemplate = (e: React.DragEvent, categoryId: string, indexInCategory: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragSource?.kind === "template") setDropTarget({ kind: "category", categoryId, indexInCategory });
  };
  const handleDragLeave = () => setDropTarget(null);

  const applyDrop = (target: DropTarget) => {
    const source = dragSource;
    if (!source) return;
    setDropTarget(null);
    setDragSource(null);

    if (source.kind === "top-level" && target.kind === "top-level") {
      if (source.index === target.index) return;
      const next = [...orderItems];
      const [removed] = next.splice(source.index, 1);
      next.splice(target.index, 0, removed);
      setOrderItems(next);
      return;
    }

    if (source.kind === "template") {
      const slug = source.slug;
      const removeFromOrder = (prev: ResourceOrderItem[]): ResourceOrderItem[] => {
        if (source.topLevelIndex != null) {
          return prev.filter((_, i) => i !== source.topLevelIndex);
        }
        if (source.categoryId != null) {
          return prev.map((item) =>
            item.type === "category" && item.id === source.categoryId
              ? { ...item, templateSlugs: item.templateSlugs.filter((s) => s !== slug) }
              : item
          );
        }
        return prev;
      };

      if (target.kind === "top-level") {
        setOrderItems((prev) => {
          const afterRemove = removeFromOrder(prev);
          const insertIndex = Math.min(target.index, afterRemove.length);
          return [
            ...afterRemove.slice(0, insertIndex),
            { type: "template" as const, slug },
            ...afterRemove.slice(insertIndex),
          ];
        });
        return;
      }

      if (target.kind === "category") {
        const toIndex = target.indexInCategory ?? -1;
        setOrderItems((prev) => {
          const afterRemove = removeFromOrder(prev);
          const catIdx = afterRemove.findIndex((i) => i.type === "category" && i.id === target.categoryId);
          if (catIdx === -1) return afterRemove;
          const cat = afterRemove[catIdx];
          if (cat.type !== "category") return afterRemove;
          const isSameCategory = source.categoryId === target.categoryId;
          const newSlugs = isSameCategory
            ? cat.templateSlugs.filter((s) => s !== slug)
            : [...cat.templateSlugs];
          const insertAt =
            toIndex >= 0 ? Math.min(toIndex, newSlugs.length) : newSlugs.length;
          newSlugs.splice(insertAt, 0, slug);
          const next = [...afterRemove];
          next[catIdx] = { ...cat, templateSlugs: newSlugs };
          return next;
        });
      }
    }
  };

  const handleDropTopLevel = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    applyDrop({ kind: "top-level", index });
  };
  const handleDropCategoryHeader = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.stopPropagation();
    applyDrop({ kind: "category", categoryId });
  };
  const handleDropCategoryTemplate = (e: React.DragEvent, categoryId: string, indexInCategory: number) => {
    e.preventDefault();
    e.stopPropagation();
    applyDrop({ kind: "category", categoryId, indexInCategory });
  };

  const slugsInOrder = new Set<string>();
  orderItems.forEach((item) => {
    if (item.type === "template") slugsInOrder.add(item.slug);
    else if (item.type === "category") item.templateSlugs.forEach((s) => slugsInOrder.add(s));
  });
  const availableTemplates = publicTemplates.filter(
    (t) => !slugsInOrder.has(t.slug) && !isSpurgeonSermonProfileSlug(t.slug)
  );

  const addCategory = () => {
    setOrderItems((prev) => [
      ...prev,
      { type: "category", id: crypto.randomUUID(), name: "New category", templateSlugs: [] },
    ]);
  };

  const addTemplateToTopLevel = (slug: string) => {
    setOrderItems((prev) => [...prev, { type: "template", slug }]);
  };

  const updateCategoryName = (categoryId: string, name: string) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.type === "category" && item.id === categoryId ? { ...item, name } : item
      )
    );
  };

  const addTemplateToCategory = (categoryId: string, slug: string) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.type === "category" && item.id === categoryId
          ? { ...item, templateSlugs: [...item.templateSlugs, slug] }
          : item
      )
    );
  };

  const removeTemplateFromCategory = (categoryId: string, slug: string) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.type === "category" && item.id === categoryId
          ? { ...item, templateSlugs: item.templateSlugs.filter((s) => s !== slug) }
          : item
      )
    );
  };

  const removeTopLevelTemplate = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const removeCategory = (categoryId: string) => {
    setOrderItems((prev) => {
      const cat = prev.find((i) => i.type === "category" && i.id === categoryId);
      if (cat?.type !== "category") return prev.filter((i) => !(i.type === "category" && i.id === categoryId));
      const templates = cat.templateSlugs.map((slug) => ({ type: "template" as const, slug }));
      const idx = prev.findIndex((i) => i.type === "category" && i.id === categoryId);
      const next = [...prev];
      next.splice(idx, 1, ...templates);
      return next;
    });
  };

  const templateBySlug = new Map(publicTemplates.map((t) => [t.slug, t]));

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
          {/* Restore from backup: new profile from JSON export */}
          <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
            <div className="border-b border-slate-200 px-6 sm:px-8 py-6">
              <h2 className="text-2xl font-bold text-slate-900">Create from backup</h2>
              <p className="text-slate-600 text-sm mt-2">
                Choose a JSON profile export (from the admin backup download or the content editor export). A new resource is created and you are taken to its content editor when the import succeeds.
              </p>
            </div>
            <div className="px-6 sm:px-8 py-6">
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50">
                {isRestoringBackup ? "Restoring…" : "Choose backup file"}
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  disabled={isRestoringBackup}
                  onChange={handleCreateFromBackup}
                />
              </label>
            </div>
          </div>

          {userRole === "admin" && (
            <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
              <div className="border-b border-slate-200 px-6 sm:px-8 py-6">
                <h2 className="text-2xl font-bold text-slate-900">Manage users</h2>
                <p className="text-slate-600 text-sm mt-2">
                  Open the user directory to invite people, assign roles, and control who can sign in to the admin area.
                </p>
              </div>
              <div className="px-6 sm:px-8 py-6">
                <Link
                  href="/admin/users"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
                >
                  <span className="sm:hidden">Users</span>
                  <span className="hidden sm:inline">Manage Users</span>
                </Link>
              </div>
            </div>
          )}

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
                Categories, the Spurgeon sermon library row, and templates in the Resources menu. Drag to reorder. Add categories and drag templates into them.
              </p>
            </div>
            <div className="px-6 sm:px-8 py-6 space-y-4">
              {publicTemplates.length === 0 ? (
                <div className="w-full max-w-xl border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
                  <div className="px-4 py-3 text-sm text-slate-500">
                    No public templates. Mark templates as public on the Templates page.
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={addCategory}
                      className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
                    >
                      Add category
                    </button>
                    <button
                      type="button"
                      onClick={addSpurgeonLibraryRow}
                      disabled={hasSpurgeonLibraryRow}
                      title={
                        hasSpurgeonLibraryRow
                          ? "Spurgeon library row is already in the list"
                          : "Add a Resources row that opens the Spurgeon sermon finder"
                      }
                      className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Spurgeon library
                    </button>
                    {availableTemplates.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          const slug = e.target.value;
                          if (slug) addTemplateToTopLevel(slug);
                          e.target.value = "";
                        }}
                        className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-700"
                      >
                        <option value="">Add template to list...</option>
                        {availableTemplates.map((t) => (
                          <option key={t.slug} value={t.slug}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="w-full max-w-xl border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden" role="list">
                    {orderItems.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500">
                        No items yet. Add a category or add a template above.
                      </div>
                    ) : (
                      orderItems.map((item, index) =>
                        item.type === "template" ? (
                          <div
                            key={`t-${item.slug}`}
                            draggable
                            onDragStart={() => handleDragStartTopLevel(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOverTopLevel(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDropTopLevel(e, index)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm text-slate-700 border-b border-slate-100 last:border-b-0 transition-colors cursor-grab active:cursor-grabbing ${dropTarget?.kind === "top-level" && dropTarget.index === index ? "bg-blue-100 ring-1 ring-blue-300" : "hover:bg-slate-50"}`}
                          >
                            <span className="shrink-0" aria-hidden>
                              <GripIcon />
                            </span>
                            <span className="min-w-0 truncate flex-1">
                              {templateBySlug.get(item.slug)?.title ?? item.slug}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeTopLevelTemplate(index)}
                              className="text-slate-400 hover:text-red-600 text-xs px-1"
                              aria-label="Remove"
                            >
                              Remove
                            </button>
                          </div>
                        ) : isResourceOrderItemSpurgeonLibrary(item) ? (
                          <div
                            key={`spurgeon-${index}`}
                            draggable
                            onDragStart={() => handleDragStartTopLevel(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOverTopLevel(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDropTopLevel(e, index)}
                            className={`flex flex-wrap items-center gap-2 px-4 py-3 text-sm text-slate-700 border-b border-slate-100 last:border-b-0 transition-colors cursor-grab active:cursor-grabbing ${dropTarget?.kind === "top-level" && dropTarget.index === index ? "bg-blue-100 ring-1 ring-blue-300" : "hover:bg-slate-50"}`}
                          >
                            <span className="shrink-0" aria-hidden>
                              <GripIcon />
                            </span>
                            <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-violet-700">
                              Spurgeon library
                            </span>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => updateSpurgeonLibraryTitle(index, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 min-w-32 px-2 py-1 border border-slate-300 rounded text-slate-900 text-sm"
                              aria-label="Label shown in Resources menu"
                            />
                            <button
                              type="button"
                              onClick={() => removeTopLevelTemplate(index)}
                              className="text-slate-400 hover:text-red-600 text-xs px-1 ml-auto"
                              aria-label="Remove Spurgeon library row"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div
                            key={`c-${item.id}`}
                            draggable
                            onDragStart={() => handleDragStartTopLevel(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOverTopLevel(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDropTopLevel(e, index)}
                            className={`border-b border-slate-100 last:border-b-0 ${dropTarget?.kind === "top-level" && dropTarget.index === index ? "bg-blue-100 ring-1 ring-blue-300" : ""}`}
                          >
                            <div
                              className={`flex items-center gap-2 px-4 py-3 text-sm text-slate-700 transition-colors cursor-grab active:cursor-grabbing ${dropTarget?.kind === "category" && dropTarget.categoryId === item.id && dropTarget.indexInCategory === undefined ? "bg-blue-100 ring-1 ring-blue-300" : "hover:bg-slate-50"}`}
                              onDragOver={(e) => handleDragOverCategoryHeader(e, item.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDropCategoryHeader(e, item.id)}
                            >
                              <span className="shrink-0" aria-hidden>
                                <GripIcon />
                              </span>
                              {editingCategoryId === item.id ? (
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => updateCategoryName(item.id, e.target.value)}
                                  onBlur={() => setEditingCategoryId(null)}
                                  onKeyDown={(e) => e.key === "Enter" && setEditingCategoryId(null)}
                                  className="flex-1 min-w-0 px-2 py-1 border border-slate-300 rounded text-slate-900"
                                  autoFocus
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditingCategoryId(item.id)}
                                  className="flex-1 min-w-0 truncate text-left font-medium"
                                >
                                  {item.name}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeCategory(item.id)}
                                className="text-slate-400 hover:text-red-600 text-xs px-1"
                                aria-label="Remove category"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="bg-slate-50 pl-6 pr-4 pb-2">
                              {item.templateSlugs.map((slug, idx) => (
                                <div
                                  key={slug}
                                  draggable
                                  onDragStart={(e) => handleDragStartCategoryTemplate(e, item.id, slug, idx)}
                                  onDragEnd={handleDragEnd}
                                  onDragOver={(e) => handleDragOverCategoryTemplate(e, item.id, idx)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDropCategoryTemplate(e, item.id, idx)}
                                  className={`flex items-center justify-between py-1.5 text-sm text-slate-600 cursor-grab active:cursor-grabbing ${dropTarget?.kind === "category" && dropTarget.categoryId === item.id && dropTarget.indexInCategory === idx ? "bg-blue-100 ring-1 ring-blue-300 rounded" : ""}`}
                                >
                                  <span className="shrink-0 text-slate-400 mr-1" aria-hidden>
                                    <GripIcon />
                                  </span>
                                  <span className="truncate flex-1">{templateBySlug.get(slug)?.title ?? slug}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeTemplateFromCategory(item.id, slug)}
                                    className="text-slate-400 hover:text-red-600 text-xs px-1"
                                    aria-label="Remove from category"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                              {availableTemplates.length > 0 && (
                                <select
                                  value=""
                                  onChange={(e) => {
                                    const slug = e.target.value;
                                    if (slug) addTemplateToCategory(item.id, slug);
                                    e.target.value = "";
                                  }}
                                  className="mt-1 text-xs px-2 py-1 border border-slate-300 rounded bg-white text-slate-600"
                                >
                                  <option value="">Add template to category...</option>
                                  {availableTemplates.map((t) => (
                                    <option key={t.slug} value={t.slug}>
                                      {t.title}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                </>
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
