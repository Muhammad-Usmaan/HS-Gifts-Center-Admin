import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR } from "@/lib/format";
import { slugify, STOCK_STATUSES, uploadSiteAsset } from "@/lib/admin";
import { toast, Toaster } from "sonner";
import { Plus, Trash2, Pencil, Upload, X, Image } from "lucide-react";

type ProductImage = { id: string; image_url: string; sort_order: number };
type Product = { id: string; name: string; slug: string; price: number; compare_at_price: number | null; short_description: string | null; full_description: string | null; stock_quantity: number; stock_status: string; is_active: boolean; is_featured: boolean; is_trending: boolean; customization_available: boolean; personalization_instructions: string | null; category_id: string | null; sort_order: number; product_images?: ProductImage[]; };
type Category = { id: string; name: string };

const emptyProduct = (): Omit<Product, "id"> => ({ name: "", slug: "", price: 0, compare_at_price: null, short_description: "", full_description: "", stock_quantity: 0, stock_status: "in_stock", is_active: true, is_featured: false, is_trending: false, customization_available: false, personalization_instructions: null, category_id: null, sort_order: 0 });

export const Route = createFileRoute("/_admin/admin/products")({
  head: () => ({ meta: [{ title: "Products | HS Admin" }, { name: "robots", content: "noindex" }] }),
  component: ProductsAdmin,
});

function ProductsAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [form, setForm] = useState<(Omit<Product, "id"> & { id?: string }) | null>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const [p, c] = await Promise.all([
      supabase.from("products").select("*, product_images(id,image_url,sort_order)").order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name").order("name"),
    ]);
    setProducts((p.data ?? []) as Product[]);
    setCats((c.data ?? []) as Category[]);
  }

  async function save() {
    if (!form || !form.name) return toast.error("Product name is required");
    if (form.price < 0) return toast.error("Price cannot be negative");
    const slug = form.slug || slugify(form.name);
    const payload = { name: form.name, slug, price: form.price, compare_at_price: form.compare_at_price, short_description: form.short_description || null, full_description: form.full_description || null, stock_quantity: form.stock_quantity, stock_status: form.stock_status as "in_stock" | "low_stock" | "out_of_stock", is_active: form.is_active, is_featured: form.is_featured, is_trending: form.is_trending, customization_available: form.customization_available, personalization_instructions: form.personalization_instructions || null, category_id: form.category_id || null, sort_order: form.sort_order };
    if (form.id) {
      const { error } = await supabase.from("products").update(payload).eq("id", form.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Product saved successfully");
    setForm(null);
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete this product and all its images?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Product deleted"); load(); }
  }

  async function toggle(id: string, field: "is_active" | "is_featured" | "is_trending", value: boolean) {
    const { error } = await supabase.from("products").update({ [field]: value }).eq("id", id);
    if (error) toast.error(error.message); else load();
  }

  async function uploadImage(productId: string, file: File) {
    setUploading(true);
    try {
      const url = await uploadSiteAsset(file);
      const { error } = await supabase.from("product_images").insert({ product_id: productId, image_url: url, sort_order: 0 });
      if (error) throw error;
      toast.success("Image added");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploading(false); }
  }

  async function deleteImage(imageId: string) {
    const { error } = await supabase.from("product_images").delete().eq("id", imageId);
    if (error) toast.error(error.message); else load();
  }

  const filtered = search ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) : products;

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">{products.length} total products</p>
        </div>
        <button onClick={() => setForm(emptyProduct())} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>
      {form && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg">{form.id ? "Edit Product" : "New Product"}</h2>
            <button onClick={() => setForm(null)} className="p-1 rounded hover:bg-accent"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Product Name *</label>
              <input placeholder="e.g. Luxury Gift Hamper" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Slug (URL)</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Price (PKR) *</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Compare-at Price (PKR)</label>
              <input type="number" placeholder="Original price (for sale display)" value={form.compare_at_price ?? ""} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value ? Number(e.target.value) : null })} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Category</label>
              <select value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm">
                <option value="">No category</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Stock Status</label>
              <select value={form.stock_status} onChange={(e) => setForm({ ...form, stock_status: e.target.value })} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm">
                {STOCK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Stock Quantity</label>
              <input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
            </div>
          </div>
          <div className="space-y-3 mb-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Short Description</label>
              <textarea value={form.short_description ?? ""} onChange={(e) => setForm({ ...form, short_description: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" placeholder="Brief product summary..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Full Description</label>
              <textarea value={form.full_description ?? ""} onChange={(e) => setForm({ ...form, full_description: e.target.value })} rows={4} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" placeholder="Detailed product description..." />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm mb-3">
            {([["is_active", "Active"], ["is_featured", "Featured"], ["is_trending", "Trending"], ["customization_available", "Customization Available"]] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[key as keyof typeof form] as boolean} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="rounded" />
                {label}
              </label>
            ))}
          </div>
          {form.customization_available && (
            <div className="mb-3">
              <label className="text-xs font-medium text-muted-foreground uppercase">Personalization Instructions</label>
              <textarea value={form.personalization_instructions ?? ""} onChange={(e) => setForm({ ...form, personalization_instructions: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" placeholder="e.g. Please provide the name to be engraved..." />
            </div>
          )}
          {/* Image management for existing products */}
          {form.id && (
            <div className="mb-3">
              <label className="text-xs font-medium text-muted-foreground uppercase block mb-2">Product Images</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(products.find((p) => p.id === form.id)?.product_images ?? []).map((img) => (
                  <div key={img.id} className="relative group">
                    <img src={img.image_url} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" />
                    <button onClick={() => deleteImage(img.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground mt-1">{uploading ? "..." : "Add"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(form.id!, f); }} disabled={uploading} />
                </label>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={save} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              {form.id ? "Update Product" : "Create Product"}
            </button>
            <button onClick={() => setForm(null)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent transition-colors">Cancel</button>
          </div>
        </div>
      )}
      <div className="mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="px-3 py-2 border border-border rounded-lg text-sm bg-background w-full max-w-xs" />
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>{["Image", "Product", "Category", "Price", "Stock", "Active", "Featured", "Trending", ""].map((h) => (
              <th key={h} className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                <td className="p-3">
                  {p.product_images?.[0]
                    ? <img src={p.product_images[0].image_url} alt="" className="w-10 h-10 object-cover rounded-lg" />
                    : <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center"><Image className="w-4 h-4 text-muted-foreground" /></div>
                  }
                </td>
                <td className="p-3">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{p.slug}</p>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{cats.find((c) => c.id === p.category_id)?.name ?? "—"}</td>
                <td className="p-3">
                  <p className="font-medium">{formatPKR(Number(p.price))}</p>
                  {p.compare_at_price && <p className="text-xs text-muted-foreground line-through">{formatPKR(Number(p.compare_at_price))}</p>}
                </td>
                <td className="p-3">
                  <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + (p.stock_status === "in_stock" ? "bg-green-100 text-green-700" : p.stock_status === "low_stock" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                    {p.stock_status.replace("_", " ")}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">Qty: {p.stock_quantity}</p>
                </td>
                <td className="p-3"><input type="checkbox" checked={p.is_active} onChange={(e) => toggle(p.id, "is_active", e.target.checked)} className="cursor-pointer" /></td>
                <td className="p-3"><input type="checkbox" checked={p.is_featured} onChange={(e) => toggle(p.id, "is_featured", e.target.checked)} className="cursor-pointer" /></td>
                <td className="p-3"><input type="checkbox" checked={p.is_trending} onChange={(e) => toggle(p.id, "is_trending", e.target.checked)} className="cursor-pointer" /></td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => setForm(p)} className="p-1.5 rounded hover:bg-accent transition-colors text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => del(p.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="p-12 text-center text-muted-foreground">{search ? "No products match your search." : "No products yet."}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
