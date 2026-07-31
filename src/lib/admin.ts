import { supabase } from "@/integrations/supabase/client";

export const ORDER_STATUSES = ["new", "confirmed", "processing", "ready", "dispatched", "delivered", "cancelled"] as const;
export const PAYMENT_STATUSES = ["pending", "paid", "partially_paid", "failed", "refunded"] as const;
export const STOCK_STATUSES = ["in_stock", "low_stock", "out_of_stock"] as const;

export const SETTINGS_FIELDS = [
  { key: "logo_url", label: "Logo URL", type: "logo" as const },
  { key: "favicon_url", label: "Favicon URL", type: "logo" as const },
  { key: "announcement", label: "Top Announcement Bar", type: "text" as const },
  { key: "hero_heading", label: "Hero Heading", type: "text" as const },
  { key: "hero_description", label: "Hero Description", type: "textarea" as const },
  { key: "footer_description", label: "Footer Description", type: "textarea" as const },
  { key: "whatsapp_number", label: "WhatsApp Number (digits only, e.g. 923427010206)", type: "text" as const },
  { key: "whatsapp_display", label: "WhatsApp Display Text", type: "text" as const },
  { key: "whatsapp_default_message", label: "WhatsApp Default Message", type: "textarea" as const },
  { key: "business_email", label: "Business Email", type: "text" as const },
  { key: "business_address", label: "Business Address", type: "text" as const },
  { key: "business_hours_weekdays", label: "Business Hours (Mon-Sat)", type: "text" as const },
  { key: "business_hours_sunday", label: "Business Hours (Sunday)", type: "text" as const },
  { key: "delivery_fee", label: "Delivery Fee (PKR)", type: "text" as const },
  { key: "instagram_url", label: "Instagram URL", type: "text" as const },
  { key: "instagram_handle", label: "Instagram Handle", type: "text" as const },
  { key: "facebook_url", label: "Facebook URL", type: "text" as const },
  { key: "facebook_handle", label: "Facebook Page Name", type: "text" as const },
  { key: "tiktok_url", label: "TikTok URL", type: "text" as const },
  { key: "tiktok_handle", label: "TikTok Handle", type: "text" as const },
];

export function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function loadSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("site_settings").select("*");
  if (error) throw error;
  const map: Record<string, string> = {};
  (data ?? []).forEach((r) => { if (r.setting_value != null) map[r.setting_key] = r.setting_value; });
  return map;
}

export async function upsertSetting(key: string, value: string) {
  const { error } = await supabase.from("site_settings").upsert(
    { setting_key: key, setting_value: value },
    { onConflict: "setting_key" },
  );
  if (error) throw error;
}

export async function uploadSiteAsset(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `uploads/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
  return data.publicUrl;
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    new: "bg-blue-100 text-blue-800",
    confirmed: "bg-indigo-100 text-indigo-800",
    processing: "bg-yellow-100 text-yellow-800",
    ready: "bg-purple-100 text-purple-800",
    dispatched: "bg-orange-100 text-orange-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800",
  };
  return map[status] ?? "bg-gray-100 text-gray-800";
}
