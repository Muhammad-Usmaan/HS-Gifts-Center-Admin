import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift, LayoutDashboard, Package, FolderTree, ShoppingCart, LogOut, Star, Settings, Users } from "lucide-react";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/_admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/admin/login" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) {
      await supabase.auth.signOut();
      throw redirect({ to: "/admin/login" });
    }
    return { user: data.user };
  },
  component: AdminLayout,
});

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.start();
    
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
    gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.error("Audio chime failed", e);
  }
}

function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    // Request desktop notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Subscribe to new orders real-time channel
    const channel = supabase.channel("admin-layout-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const order = payload.new as { order_number: string; customer_name: string; total: number };
        
        // Play notification sound
        playChime();

        // Show standard in-app toast
        toast.success(`🎁 New Order Received! ${order.order_number} by ${order.customer_name}`, {
          duration: 10000,
        });

        // Show browser desktop notification if permitted
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("New Order Received!", {
            body: `Order ${order.order_number} — PKR ${order.total} by ${order.customer_name}`,
            icon: "/favicon.ico",
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  }
  return (
    <div className="min-h-screen flex bg-accent/10">
      <Toaster position="top-right" richColors />
      <aside className="w-60 bg-card border-r border-border p-5 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <Gift className="w-5 h-5 text-primary" />
          <span className="font-serif text-lg font-semibold">HS Admin</span>
        </div>
        <nav className="flex-1 space-y-1 text-sm">
          <NavLink to="/admin" icon={LayoutDashboard} label="Dashboard" />
          <NavLink to="/admin/orders" icon={ShoppingCart} label="Orders" />
          <NavLink to="/admin/products" icon={Package} label="Products" />
          <NavLink to="/admin/categories" icon={FolderTree} label="Categories" />
          <NavLink to="/admin/reviews" icon={Star} label="Reviews" />
          <NavLink to="/admin/settings" icon={Settings} label="Site Settings" />
          <NavLink to="/admin/admins" icon={Users} label="Admins" />
        </nav>
        <button onClick={logout} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive mt-4 pt-4 border-t border-border">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link to={to} activeOptions={{ exact: true }} activeProps={{ className: "bg-primary/10 text-primary" }} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent">
      <Icon className="w-4 h-4" /> {label}
    </Link>
  );
}
