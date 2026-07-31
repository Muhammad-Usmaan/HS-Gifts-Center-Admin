import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify, uploadSiteAsset } from "@/lib/admin";
import { toast, Toaster } from "sonner";
import { Plus, Trash2, Pencil, Upload } from "lucide-react";

type Category = { id: string; name: string; slug: string; description: string | null; image_url: string | null; banner_url: string | null; is_active: boolean; is_featured: boolean; sort_order: number; };
const empty = (): Omit<Category, "id"> => ({ name: "", slug: "", description: "", image_url: null, banner_url: null, is_active: true, is_featured: false, sort_order: 0 });

export const Route = createFileRoute("/_admin/admin/categories")({
  head: () => ({ meta: [{ title: "Categories | HS Admin" }, { name: "robots", content: "noindex" }] }),
  component: CategoriesAdmin,
});

function CategoriesAdmin() {
  const [cats, setCats] = useState<Category[]>([]);
  const [form, setForm] = useState<Omit<Category, "id"> & { id?: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setCats((data ?? []) as Category[]);
  }

  async function save() {
    if (!form || !form.name) return toast.error("Category name is required");
    const slug = form.slug || slugify(form.name);
    const payload = { name: form.name, slug, description: form.description || null, image_url: form.image_url || null, banner_url: form.banner_url || null, is_active: form.is_active, is_featured: form.is_featured, sort_order: form.sort_order };
    if (form.id) {
      const { error } = await supabase.from("categories").update(payload).eq("id", form.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Category saved");
    setForm(null);
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete this category? Products in this category will be unassigned.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  async function toggle(id: string, field: "is_active" | "is_featured", value: boolean) {
    const { error } = await supabase.from("categories").update({ [field]: value }).eq("id", id);
    if (error) toast.error(error.message); else load();
  }

  async function uploadImage(file: File, type: "image_url" | "banner_url") {
    setUploading(true);
    try {
      const url = await uploadSiteAsset(file);
      setForm((f) => f ? { ...f, [type]: url } : f);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploading(false); }
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">{cats.length} categories</p>
        </div>
        <button onClick={() => setForm(empty())} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>
      {form && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6 space-y-3">
          <h2 className="font-serif text-lg">{form.id ? "Edit Category" : "New Category"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Name *</label>
              <input placeholder="e.g. Gift Hampers" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Slug</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Image URL</label>
              <input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" placeholder="https://..." />
              <label className="mt-1 inline-flex items-center gap-1.5 text-xs text-primary cursor-pointer hover:underline">
                <Upload className="w-3 h-3" /> {uploading ? "Uploading..." : "Upload Image"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "image_url"); }} disabled={uploading} />
              </label>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">Description</label>
            <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
              Featured
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Save Category</button>
            <button onClick={() => setForm(null)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent transition-colors">Cancel</button>
          </div>
        </div>
      )}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>{["", "Name", "Slug", "Sort", "Active", "Featured", ""].map((h) => (
              <th key={h} className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                <td className="p-3">{c.image_url && <img src={c.image_url} alt="" className="w-10 h-10 object-cover rounded-lg" />}</td>
                <td className="p-3 font-medium">{c.name}<br /><span className="text-xs text-muted-foreground font-normal">{c.description}</span></td>
                <td className="p-3 text-xs text-muted-foreground font-mono">{c.slug}</td>
                <td className="p-3">{c.sort_order}</td>
                <td className="p-3"><input type="checkbox" checked={c.is_active} onChange={(e) => toggle(c.id, "is_active", e.target.checked)} className="cursor-pointer" /></td>
                <td className="p-3"><input type="checkbox" checked={c.is_featured} onChange={(e) => toggle(c.id, "is_featured", e.target.checked)} className="cursor-pointer" /></td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => setForm(c)} className="p-1.5 rounded hover:bg-accent transition-colors text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => del(c.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {cats.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">No categories yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
