import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ── Invite a new admin by email ──────────────────────────────────────────────
// Uses the Supabase Admin API (service role) to send an invite email.
// The invitee clicks the link, sets a password, and is automatically granted
// the "admin" role via the grant_admin_role server function below.
export const inviteAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ email: z.string().email().max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Check if a user with this email already exists
    const { data: existingUsers, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw new Error("Failed to check existing users: " + listErr.message);

    const existing = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
    );

    let userId: string;

    if (existing) {
      userId = existing.id;
      // User exists — just grant admin role (they may already have an account)
    } else {
      // 2. Send an invite email via Supabase Auth Admin API
      // Since it runs server-side, we construct the redirect URI using the host domain config.
      const redirectUri = process.env.VITE_SUPABASE_URL 
        ? `${process.env.VITE_SUPABASE_URL.replace("https://", "https://admin.").replace(".supabase.co", ".vercel.app")}/admin/login`
        : "http://localhost:3000/admin/login";

      const { data: invited, error: invErr } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
          redirectTo: redirectUri,
        });
      if (invErr) throw new Error("Failed to send invite: " + invErr.message);
      userId = invited.user.id;
    }

    // 3. Upsert admin role in user_roles table
    const { error: roleErr } = await (supabaseAdmin as any)
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

    if (roleErr) {
      // Try insert if upsert fails (table may not have the composite unique constraint)
      const { error: insertErr } = await (supabaseAdmin as any)
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });
      if (insertErr && !insertErr.message.includes("duplicate")) {
        throw new Error("Failed to grant admin role: " + insertErr.message);
      }
    }

    return {
      success: true,
      message: existing
        ? `Admin role granted to existing user ${data.email}`
        : `Invitation email sent to ${data.email}`,
      isExisting: !!existing,
    };
  });

// ── List all admins ──────────────────────────────────────────────────────────
export const listAdmins = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: roles, error } = await (supabaseAdmin as any)
    .from("user_roles")
    .select("user_id, role, created_at")
    .eq("role", "admin");

  if (error) throw new Error("Failed to list admins: " + error.message);
  if (!roles || roles.length === 0) return [];

  // Fetch user details for each admin
  const { data: allUsers, error: usersErr } = await supabaseAdmin.auth.admin.listUsers();
  if (usersErr) throw new Error("Failed to fetch user details: " + usersErr.message);

  const userMap = new Map(allUsers?.users?.map((u) => [u.id, u]) ?? []);

  return (roles as Array<{ user_id: string; role: string; created_at: string }>).map((r) => {
    const user = userMap.get(r.user_id);
    return {
      user_id: r.user_id,
      email: user?.email ?? "(unknown)",
      created_at: r.created_at,
      last_sign_in: user?.last_sign_in_at ?? null,
      confirmed: !!user?.email_confirmed_at,
    };
  });
});

// ── Remove admin role ────────────────────────────────────────────────────────
export const removeAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ user_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify there's more than one admin before removing
    const { data: roles, error: countErr } = await (supabaseAdmin as any)
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (countErr) throw new Error("Failed to verify admin count");
    if (!roles || roles.length <= 1) {
      throw new Error("Cannot remove the last admin account");
    }

    const { error } = await (supabaseAdmin as any)
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", "admin");

    if (error) throw new Error("Failed to remove admin: " + error.message);
    return { success: true };
  });
