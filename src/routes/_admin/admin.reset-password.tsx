import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast, Toaster } from "sonner";
import { Gift, Lock } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/reset-password")({
  head: () => ({ meta: [{ title: "Set Password | HS Admin" }, { name: "robots", content: "noindex" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setHasSession(true);
      } else {
        toast.error("Please use the invitation or password reset link sent to your email.");
      }
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters long");
    }
    if (password !== confirmPassword) {
      return toast.error("Passwords do not match");
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      return toast.error(error.message);
    }

    toast.success("Password set successfully!");
    setTimeout(() => {
      navigate({ to: "/admin" });
    }, 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-accent/20">
      <Toaster position="top-center" richColors />
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl">
        <div className="text-center mb-6">
          <Gift className="w-8 h-8 text-primary mx-auto" />
          <h1 className="font-serif text-2xl mt-3 font-semibold">Set Password</h1>
          <p className="text-sm text-muted-foreground">Setup a secure password for your admin account</p>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">New Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-sm" 
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Confirm New Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-sm" 
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading || !hasSession} 
            className="btn-primary w-full disabled:opacity-60 py-2.5"
          >
            {loading ? "Saving…" : "Set Password & Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}
