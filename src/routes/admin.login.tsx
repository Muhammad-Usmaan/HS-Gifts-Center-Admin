import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster } from "sonner";
import { Gift } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login | HS Gift Shop" }, { name: "robots", content: "noindex" }] }),
  ssr: false,
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    // check admin role
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return toast.error("Sign-in failed");
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) {
      await supabase.auth.signOut();
      return toast.error("This account is not an admin.");
    }
    toast.success("Welcome back!");
    navigate({ to: "/admin" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-accent/20">
      <Toaster position="top-center" richColors />
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl">
        <div className="text-center mb-6">
          <Gift className="w-8 h-8 text-primary mx-auto" />
          <h1 className="font-serif text-2xl mt-3">Admin Login</h1>
          <p className="text-sm text-muted-foreground">HS Gift Shop Dashboard</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-sm">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 px-3 py-2 border border-border rounded" />
          </div>
          <div>
            <label className="text-sm">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 px-3 py-2 border border-border rounded" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-6"><Link to="/" className="hover:text-primary">← Back to store</Link></p>
      </div>
    </div>
  );
}
