import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast, Toaster } from "sonner";
import { Plus, Trash2, Star, Eye, EyeOff, Pencil } from "lucide-react";

type Review = { id: string; customer_name: string; customer_city: string | null; rating: number; review_text: string; customer_image_url: string | null; is_published: boolean; sort_order: number; };
const empty = (): Omit<Review, "id"> => ({ customer_name: "", customer_city: "", rating: 5, review_text: "", customer_image_url: null, is_published: true, sort_order: 0 });

export const Route = createFileRoute("/_admin/admin/reviews")({
  head: () => ({ meta: [{ title: "Reviews | HS Admin" }, { name: "robots", content: "noindex" }] }),
  component: ReviewsAdmin,
});

function ReviewsAdmin() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [form, setForm] = useState<Omit<Review, "id"> & { id?: string } | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("reviews").select("*").order("sort_order");
    setReviews((data ?? []) as Review[]);
  }

  async function save() {
    if (!form || !form.customer_name) return toast.error("Customer name is required");
    if (!form.review_text) return toast.error("Review text is required");
    const payload = { customer_name: form.customer_name, customer_city: form.customer_city || null, rating: form.rating, review_text: form.review_text, customer_image_url: form.customer_image_url || null, is_published: form.is_published, sort_order: form.sort_order };
    if (form.id) {
      const { error } = await supabase.from("reviews").update(payload).eq("id", form.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("reviews").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Review saved");
    setForm(null);
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  async function toggle(id: string, published: boolean) {
    const { error } = await supabase.from("reviews").update({ is_published: published }).eq("id", id);
    if (error) toast.error(error.message); else load();
  }

  const published = reviews.filter((r) => r.is_published).length;

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">{reviews.length} total · {published} published</p>
        </div>
        <button onClick={() => setForm(empty())} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Review
        </button>
      </div>
      {form && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="font-serif text-lg mb-4">{form.id ? "Edit Review" : "New Review"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Customer Name *</label>
              <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" placeholder="Ayesha K." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">City</label>
              <input value={form.customer_city ?? ""} onChange={(e) => setForm({ ...form, customer_city: e.target.value })} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" placeholder="Karachi" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })}>
                    <Star className={"w-6 h-6 transition-colors " + (n <= form.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
                  </button>
                ))}
                <span className="text-sm text-muted-foreground ml-2">{form.rating}/5</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground uppercase">Review Text *</label>
            <textarea value={form.review_text} onChange={(e) => setForm({ ...form, review_text: e.target.value })} rows={3} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" placeholder="Write review here..." />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer mb-4">
            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="rounded" />
            Published (visible on storefront)
          </label>
          <div className="flex gap-2">
            <button onClick={save} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Save Review</button>
            <button onClick={() => setForm(null)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent transition-colors">Cancel</button>
          </div>
        </div>
      )}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>{["Customer", "Rating", "Review", "Published", "Order", ""].map((h) => (
              <th key={h} className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                <td className="p-3 font-medium">{r.customer_name}<br /><span className="text-xs text-muted-foreground font-normal">{r.customer_city}</span></td>
                <td className="p-3"><span className="flex gap-0.5">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}</span></td>
                <td className="p-3 max-w-xs"><p className="truncate text-muted-foreground">{r.review_text}</p></td>
                <td className="p-3">
                  <button onClick={() => toggle(r.id, !r.is_published)} className={"flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full " + (r.is_published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground")}>
                    {r.is_published ? <><Eye className="w-3 h-3" />Published</> : <><EyeOff className="w-3 h-3" />Hidden</>}
                  </button>
                </td>
                <td className="p-3 text-muted-foreground">{r.sort_order}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => setForm(r)} className="p-1.5 rounded hover:bg-accent transition-colors text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => del(r.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {reviews.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">No reviews yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
