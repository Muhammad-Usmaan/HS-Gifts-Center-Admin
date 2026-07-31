import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR } from "@/lib/format";
import { ORDER_STATUSES, PAYMENT_STATUSES, statusColor } from "@/lib/admin";
import { toast, Toaster } from "sonner";
import { MessageCircle, ChevronDown, ChevronUp, Search, X } from "lucide-react";

type OrderItem = { id: string; product_name_snapshot: string; product_price_snapshot: number; quantity: number; line_total: number; customization_details: Record<string, unknown> | null; };
type Order = { id: string; order_number: string; customer_name: string; phone: string; whatsapp_number: string | null; email: string | null; city: string; delivery_address: string; landmark: string | null; recipient_name: string | null; preferred_delivery_date: string | null; customer_notes: string | null; admin_notes: string | null; subtotal: number; delivery_fee: number; total: number; payment_method: string; payment_status: string; order_status: string; is_read: boolean; created_at: string; order_items?: OrderItem[]; };

export const Route = createFileRoute("/_admin/admin/orders")({
  head: () => ({ meta: [{ title: "Orders | HS Admin" }, { name: "robots", content: "noindex" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-orders-list").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function load() {
    const { data } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
    const list = (data ?? []) as Order[];
    setOrders(list);
    const c: Record<string, number> = { all: list.length };
    ORDER_STATUSES.forEach((s) => { c[s] = list.filter((o) => o.order_status === s).length; });
    setCounts(c);
  }

  async function updateField(id: string, field: string, value: string | boolean) {
    const { error } = await supabase.from("orders").update({ [field]: value } as never).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); load(); }
  }

  async function expandOrder(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    await supabase.from("orders").update({ is_read: true }).eq("id", id);
    setExpanded(id);
    load();
  }

  const filtered = orders.filter((o) => {
    const matchStatus = !filter || o.order_status === filter;
    const matchSearch = !search || o.order_number.toLowerCase().includes(search.toLowerCase()) || o.customer_name.toLowerCase().includes(search.toLowerCase()) || o.phone.includes(search);
    return matchStatus && matchSearch;
  });

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">{orders.length} total orders · {counts.new ?? 0} new</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order #, name, phone..." className="w-full pl-9 pr-8 py-2 border border-border rounded-lg text-sm bg-background" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip label={"All (" + (counts.all ?? 0) + ")"} active={!filter} onClick={() => setFilter("")} />
          {ORDER_STATUSES.map((s) => (
            <FilterChip key={s} label={s + " (" + (counts[s] ?? 0) + ")"} active={filter === s} onClick={() => setFilter(s)} color={statusColor(s)} />
          ))}
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              {["Order", "Customer", "Total", "Payment", "Status", "Date", ""].map((h) => (
                <th key={h} className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <>
                <tr key={o.id} className={"border-t border-border hover:bg-muted/20 transition-colors " + (!o.is_read ? "bg-primary/5" : "")}>
                  <td className="p-3">
                    <p className="font-medium">{o.order_number}</p>
                    {!o.is_read && <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                  </td>
                  <td className="p-3">{o.customer_name}<br /><span className="text-xs text-muted-foreground">{o.phone}</span></td>
                  <td className="p-3 font-medium">{formatPKR(Number(o.total))}</td>
                  <td className="p-3">
                    <select value={o.payment_status} onChange={(e) => updateField(o.id, "payment_status", e.target.value)} className="text-xs border border-border rounded px-2 py-1 bg-background mb-1 block">
                      {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <span className="text-[10px] text-muted-foreground">{o.payment_method}</span>
                  </td>
                  <td className="p-3">
                    <select value={o.order_status} onChange={(e) => updateField(o.id, "order_status", e.target.value)} className={"text-xs rounded-full px-3 py-1 font-medium cursor-pointer border-0 " + statusColor(o.order_status)}>
                      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(o.created_at).toLocaleDateString()}<br />
                    <span className="text-[10px]">{new Date(o.created_at).toLocaleTimeString()}</span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => expandOrder(o.id)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                      {expanded === o.id ? <><ChevronUp className="w-3 h-3" />Hide</> : <><ChevronDown className="w-3 h-3" />Details</>}
                    </button>
                  </td>
                </tr>
                {expanded === o.id && (
                  <tr key={o.id + "-exp"} className="bg-accent/5">
                    <td colSpan={7} className="p-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 text-sm">
                          <p><span className="font-semibold">Address:</span> {o.delivery_address}{o.landmark ? " (" + o.landmark + ")" : ""}</p>
                          <p><span className="font-semibold">City:</span> {o.city}</p>
                          {o.recipient_name && <p><span className="font-semibold">Recipient:</span> {o.recipient_name}</p>}
                          {o.email && <p><span className="font-semibold">Email:</span> {o.email}</p>}
                          {o.preferred_delivery_date && <p><span className="font-semibold">Delivery Date:</span> {o.preferred_delivery_date}</p>}
                          {o.customer_notes && <p><span className="font-semibold">Customer Notes:</span> {o.customer_notes}</p>}
                          <p><span className="font-semibold">Subtotal:</span> {formatPKR(Number(o.subtotal))} + Delivery {formatPKR(Number(o.delivery_fee))}</p>
                          <a href={"https://wa.me/" + (o.whatsapp_number ?? o.phone.replace(/\D/g, ""))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-green-600 hover:underline mt-2 font-medium">
                            <MessageCircle className="w-4 h-4" /> WhatsApp Customer
                          </a>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">Admin Notes</label>
                          <textarea defaultValue={o.admin_notes ?? ""} onBlur={(e) => updateField(o.id, "admin_notes", e.target.value)} rows={3} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background resize-none" placeholder="Add private notes..." />
                        </div>
                      </div>
                      {(o.order_items ?? []).length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Order Items</p>
                          <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                            <thead className="bg-muted/30">
                              <tr><th className="text-left p-2">Product</th><th className="text-left p-2">Qty</th><th className="text-left p-2">Unit Price</th><th className="text-left p-2">Total</th></tr>
                            </thead>
                            <tbody>
                              {(o.order_items ?? []).map((item) => (
                                <tr key={item.id} className="border-t border-border">
                                  <td className="p-2">{item.product_name_snapshot}</td>
                                  <td className="p-2">{item.quantity}</td>
                                  <td className="p-2">{formatPKR(Number(item.product_price_snapshot))}</td>
                                  <td className="p-2 font-medium">{formatPKR(Number(item.line_total))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FilterChip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} className={"px-3 py-1.5 rounded-full text-xs font-medium border transition-colors " + (active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent " + (color ?? ""))}>
      {label}
    </button>
  );
}
