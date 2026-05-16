const mockCreateClient = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => mockCreateClient(),
}));

import { render, screen, waitFor } from "@testing-library/react";
import AdminSettingsPage from "../page";

function makeSupabaseClient(role: "admin" | "counselee") {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: "test-user" } } }),
    },
    from: (table: string) => {
      if (table === "user_profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { role }, error: null }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === "admin_settings") {
        return {
          select: (cols: string) => ({
            eq: () => ({
              single: async () => {
                if (cols.includes("public_template_order")) {
                  return { data: { public_template_order: null }, error: null };
                }
                return {
                  data: {
                    verification_code_length: 6,
                    verification_code_expiry_minutes: 15,
                    enable_verification_code_login: true,
                  },
                  error: null,
                };
              },
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      return {};
    },
  };
}

describe("AdminSettingsPage", () => {
  beforeEach(() => {
    mockCreateClient.mockReset();
  });

  it("shows Manage Users link for admins", async () => {
    mockCreateClient.mockImplementation(() => makeSupabaseClient("admin"));

    render(<AdminSettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /manage users/i })).toHaveAttribute("href", "/admin/users");
    });
  });

  it("does not show Manage Users link for non-admins", async () => {
    mockCreateClient.mockImplementation(() => makeSupabaseClient("counselee"));

    render(<AdminSettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Create from backup" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: /manage users/i })).not.toBeInTheDocument();
  });
});
