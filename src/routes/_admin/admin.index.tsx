import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR } from "@/lib/format";
import { ORDER_STATUSES, statusColor } from "@/lib/admin";
import { toast, Toaster } from "sonner";
import { ShoppingCart, Clock, CheckCircle2, XCircle, Star, TrendingUp, Package, AlertCircle, Truck, ArrowRight, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type Order = { id: string; order_number: string; customer_name: string; phone: string; city: string; total: number; order_status: string; payment_status: string; created_at: string; is_read: boolean; };

const STATUS_COLORS: Record<string, string> = { new: "#3b82f6", confirmed: "#6366f1", processing: "#f59e0b", ready: "#a855f7", dispatched: "#f97316", delivered: "#22c55e", cancelled: "#ef4444" };

export const Route = createFileRoute("/_admin/admin/")({
  head: () => ({ meta: [{ title: "Dashboard | HS Gift Shop Admin" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, revenue: 0, today: 0, unread: 0, byStatus: {} as Record<string, number>, products: 0, reviews: 0 });

  useEffect(() => {
    load();
    const channel = supabase.channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT") toast.success("New order: " + (payload.new as Order).order_number, { duration: 5000 });
        load();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: orderData }, { count: productCount }, { count: reviewCount }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("reviews").select("*", { count: "exact", head: true }),
    ]);
    const list = (orderData ?? []) as Order[];
    setOrders(list.slice(0, 10));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const byStatus: Record<string, number> = {};
    ORDER_STATUSES.forEach((s) => { byStatus[s] = list.filter((o) => o.order_status === s).length; });
    setStats({ total: list.length, revenue: list.filter((o) => o.order_status !== "cancelled").reduce((s, o) => s + Number(o.total || 0), 0), today: list.filter((o) => new Date(o.created_at) >= today).length, unread: list.filter((o) => !o.is_read).length, byStatus, products: productCount ?? 0, reviews: reviewCount ?? 0 });
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ order_status: status as never }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Order updated"); load(); }
  }

  const chartData = ORDER_STATUSES.map((s) => ({ name: s, count: stats.byStatus[s] ?? 0 }));

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Live overview — updates in real time</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50">
          <RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin" : "")} /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={ShoppingCart} label="Total Orders" value={String(stats.total)} color="blue" />
        <StatCard icon={TrendingUp} label="Total Revenue" value={formatPKR(stats.revenue)} color="green" />
        <StatCard icon={Clock} label="Today's Orders" value={String(stats.today)} color="purple" />
        <StatCard icon={AlertCircle} label="Unread / New" value={String(stats.unread)} color="orange" highlight={stats.unread > 0} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <QuickLink to="/admin/products" icon={Package} label="Products" value={String(stats.products)} />
        <QuickLink to="/admin/reviews" icon={Star} label="Reviews" value={String(stats.reviews)} />
        <QuickLink to="/admin/orders" icon={CheckCircle2} label="Delivered" value={String(stats.byStatus.delivered ?? 0)} />
        <QuickLink to="/admin/orders" icon={XCircle} label="Cancelled" value={String(stats.byStatus.cancelled ?? 0)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h2 className="font-serif text-lg mb-4">Orders by Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: unknown) => [String(v) + " orders", ""]} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-serif text-lg mb-4">Status Breakdown</h2>
          <div className="space-y-1">
            {ORDER_STATUSES.map((s) => (
              <Link key={s} to="/admin/orders" className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent transition-colors">
                <span className={"text-xs font-medium px-2 py-1 rounded-full capitalize " + statusColor(s)}>{s}</span>
                <span className="font-semibold text-sm">{stats.byStatus[s] ?? 0}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-lg">Recent Orders</h2>
          <Link to="/admin/orders" className="flex items-center gap-1 text-sm text-primary hover:underline">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                {["Order #", "Customer", "City", "Total", "Status", "Date"].map((h) => (
                  <th key={h} className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className={"border-t border-border hover:bg-muted/20 transition-colors " + (!o.is_read ? "bg-primary/5" : "")}>
                  <td className="p-3 font-medium">
                    {o.order_number}
                    {!o.is_read && <span className="ml-2 text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                  </td>
                  <td className="p-3">{o.customer_name}<br /><span className="text-xs text-muted-foreground">{o.phone}</span></td>
                  <td className="p-3 text-muted-foreground">{o.city}</td>
                  <td className="p-3 font-medium">{formatPKR(Number(o.total))}</td>
                  <td className="p-3">
                    <select
                      value={o.order_status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                      className={"text-xs rounded-full px-3 py-1 font-medium cursor-pointer border-0 " + statusColor(o.order_status)}
                    >
                      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(o.created_at).toLocaleDateString()}<br />
                    <span className="text-[10px]">{new Date(o.created_at).toLocaleTimeString()}</span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No orders yet — they appear here in real time.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value, color, highlight }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: "blue" | "green" | "purple" | "orange"; highlight?: boolean }) {
  const colorMap = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600", orange: "bg-orange-50 text-orange-600" };
  return (
    <div className={"p-5 bg-card border rounded-xl transition-all " + (highlight ? "border-primary shadow-sm" : "border-border")}>
      <div className={"w-9 h-9 rounded-lg flex items-center justify-center " + colorMap[color]}><Icon className="w-4 h-4" /></div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground mt-3">{label}</p>
      <p className="font-serif text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, value }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Link to={to} className="p-4 bg-card border border-border rounded-xl hover:border-primary hover:shadow-sm transition-all group">
      <Icon className="w-4 h-4 text-primary" />
      <p className="text-xs text-muted-foreground mt-2">{label}</p>
      <p className="font-serif text-xl font-semibold mt-1 group-hover:text-primary transition-colors">{value}</p>
    </Link>
  );
}
