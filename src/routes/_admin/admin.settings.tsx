import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SETTINGS_FIELDS, loadSettings, upsertSetting, uploadSiteAsset } from "@/lib/admin";
import { toast, Toaster } from "sonner";
import { Save, Upload, Image, Phone, Globe, Instagram, Facebook, Video, Truck, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/settings")({
  head: () => ({ meta: [{ title: "Settings | HS Admin" }, { name: "robots", content: "noindex" }] }),
  component: SettingsAdmin,
});

const SETTING_GROUPS = [
  { title: "Logo & Branding", icon: Image, keys: ["announcement", "hero_heading", "hero_description", "footer_description"] },
  { title: "Contact Info", icon: Phone, keys: ["whatsapp_number", "whatsapp_display", "whatsapp_default_message", "business_email", "business_address"] },
  { title: "Delivery", icon: Truck, keys: ["delivery_fee"] },
  { title: "Instagram", icon: Instagram, keys: ["instagram_url", "instagram_handle"] },
  { title: "Facebook", icon: Facebook, keys: ["facebook_url", "facebook_handle"] },
  { title: "TikTok", icon: Video, keys: ["tiktok_url", "tiktok_handle"] },
];

function SettingsAdmin() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadSettings().then(setSettings).finally(() => setLoading(false)); }, []);

  async function save() {
    setSaving(true);
    try {
      for (const field of SETTINGS_FIELDS) {
        if (settings[field.key] !== undefined) await upsertSetting(field.key, settings[field.key] ?? "");
      }
      toast.success("All settings saved!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(false); }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadSiteAsset(file);
      setSettings((s) => ({ ...s, logo_url: url }));
      await upsertSetting("logo_url", url);
      toast.success("Logo uploaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploading(false); }
  }

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground p-8"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />Loading settings…</div>;

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Site Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Control every aspect of your storefront</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors">
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save All Changes"}
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logo section */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-5 sticky top-6">
            <h2 className="font-serif text-base font-semibold mb-4">Logo</h2>
            <div className="flex flex-col items-center gap-4">
              <div className="w-full h-32 bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden border border-border">
                {settings.logo_url
                  ? <img src={settings.logo_url} alt="Site logo" className="max-h-28 max-w-full object-contain p-2" />
                  : <p className="text-xs text-muted-foreground">No logo set</p>
                }
              </div>
              <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg cursor-pointer hover:bg-accent text-sm font-medium transition-colors">
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading…" : "Upload Logo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
              </label>
              <div className="w-full">
                <label className="text-xs text-muted-foreground">Or enter URL directly</label>
                <input type="text" value={settings.logo_url ?? ""} onChange={(e) => setSettings((s) => ({ ...s, logo_url: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" placeholder="https://..." />
              </div>
            </div>
          </div>
        </div>
        {/* All setting groups */}
        <div className="lg:col-span-2 space-y-5">
          {SETTING_GROUPS.map((group) => {
            const GroupIcon = group.icon;
            const fields = SETTINGS_FIELDS.filter((f) => group.keys.includes(f.key));
            if (fields.length === 0) return null;
            return (
              <div key={group.title} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                    <GroupIcon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h2 className="font-serif text-base font-semibold">{group.title}</h2>
                </div>
                <div className="space-y-3">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{field.label}</label>
                      {field.type === "textarea" ? (
                        <textarea value={settings[field.key] ?? ""} onChange={(e) => setSettings((s) => ({ ...s, [field.key]: e.target.value }))} rows={3} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" />
                      ) : (
                        <input type="text" value={settings[field.key] ?? ""} onChange={(e) => setSettings((s) => ({ ...s, [field.key]: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
