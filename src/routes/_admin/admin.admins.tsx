import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { toast, Toaster } from "sonner";
import { UserPlus, Trash2, Shield, ShieldCheck, RefreshCw, Mail, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { inviteAdmin, listAdmins, removeAdmin } from "@/lib/admin-invite.functions";

export const Route = createFileRoute("/_admin/admin/admins")({
  head: () => ({ meta: [{ title: "Manage Admins | HS Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminsPage,
});

type AdminUser = {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in: string | null;
  confirmed: boolean;
};

function AdminsPage() {
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listAdmins();
      setAdmins(result as AdminUser[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load admins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const result = await inviteAdmin({ data: { email: email.trim() } });
      toast.success(result.message);
      setEmail("");
      await fetchAdmins();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send invite";
      if (msg.includes("service_role") || msg.includes("not authorized") || msg.includes("Admin API")) {
        toast.error("Service role key required. See the note below.", { duration: 6000 });
      } else {
        toast.error(msg);
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(userId: string, adminEmail: string) {
    if (!confirm(`Remove admin access for ${adminEmail}? They will no longer be able to log in to the admin panel.`)) return;
    setRemovingId(userId);
    try {
      await removeAdmin({ data: { user_id: userId } });
      toast.success(`Admin access removed for ${adminEmail}`);
      await fetchAdmins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove admin");
    } finally {
      setRemovingId(null);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-PK", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold flex items-center gap-3">
              <Shield className="w-7 h-7 text-primary" />
              Manage Admins
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Invite new admins and manage existing admin access
            </p>
          </div>
          <button
            onClick={fetchAdmins}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Invite New Admin Card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-serif text-lg font-semibold">Invite New Admin</h2>
          </div>

          <form onSubmit={handleInvite} className="flex gap-3">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="admin-invite-email"
                type="email"
                required
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={inviting}
                className="w-full pl-10 pr-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              id="admin-invite-submit"
              disabled={inviting || !email.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              {inviting ? "Sending…" : "Send Invite"}
            </button>
          </form>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Requirements for invite email to work:
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>Add <code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> to your <code className="bg-amber-100 px-1 rounded">.env</code> file</li>
              <li>Get it from: Supabase Dashboard → Project → Settings → API → <strong>service_role secret</strong></li>
              <li>Also add it to Vercel Environment Variables for production</li>
            </ol>
          </div>
        </div>

        {/* Current Admins List */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-serif text-lg font-semibold">Current Admins</h2>
            <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {admins.length} admin{admins.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Loading admins…
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No admins found in the database.</p>
              <p className="text-xs mt-1">Invite an admin above to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {admins.map((admin) => (
                <div key={admin.user_id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold text-sm uppercase">
                      {admin.email[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{admin.email}</p>
                      {admin.confirmed ? (
                        <span className="flex items-center gap-0.5 text-xs text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          <Clock className="w-3 h-3" /> Pending invite
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last sign in: {formatDate(admin.last_sign_in)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(admin.user_id, admin.email)}
                    disabled={removingId === admin.user_id || admins.length <= 1}
                    title={admins.length <= 1 ? "Cannot remove the last admin" : `Remove ${admin.email}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    {removingId === admin.user_id ? (
                      <div className="w-3.5 h-3.5 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How to add yourself manually note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-900">
          <p className="font-semibold mb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Quick Fix: Add yourself as admin right now
          </p>
          <p className="text-xs text-blue-800 mb-3">
            If you created a user in Supabase but they show "not admin", run this SQL in your Supabase dashboard:
          </p>
          <pre className="bg-blue-100 rounded-lg p-3 text-xs font-mono overflow-x-auto text-blue-900">
{`-- Go to Supabase Dashboard → SQL Editor and run:
INSERT INTO user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'your@email.com'),
  'admin'
)
ON CONFLICT DO NOTHING;`}
          </pre>
        </div>
      </div>
    </>
  );
}
