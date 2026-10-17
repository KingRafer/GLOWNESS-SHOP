// GLOWNESS SHOP — Edge Function: tulis ke app_storage (service role)
// Deploy: supabase functions deploy storage-write --no-verify-jwt
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STORAGE_WRITE_SECRET (opsional tapi sangat disarankan)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-glowness-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const secret = Deno.env.get("STORAGE_WRITE_SECRET") || "";
    if (secret) {
      const got = req.headers.get("x-glowness-secret") || "";
      if (got !== secret) {
        return json({ error: "Unauthorized" }, 401);
      }
    }

    const body = await req.json();
    const key = String(body?.key || "").trim();
    const action = String(body?.action || "upsert").toLowerCase();
    const value = body?.value;

    if (!key || key.length > 200) {
      return json({ error: "Invalid key" }, 400);
    }
    // Hanya key internal aplikasi
    if (!key.startsWith("oliv_")) {
      return json({ error: "Key not allowed" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!url || !serviceKey) {
      return json({ error: "Server misconfigured" }, 500);
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (action === "delete") {
      const { error } = await admin.from("app_storage").delete().eq("key", key);
      if (error) return json({ error: error.message }, 500);
      await admin.from("app_storage_audit").insert({
        key,
        action: "delete",
        meta: { via: "storage-write" },
      });
      return json({ ok: true, key, action: "delete" });
    }

    // upsert
    if (value === undefined) {
      return json({ error: "value required" }, 400);
    }

    const { error } = await admin.from("app_storage").upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    });
    if (error) return json({ error: error.message }, 500);

    await admin.from("app_storage_audit").insert({
      key,
      action: "upsert",
      meta: {
        via: "storage-write",
        bytes: JSON.stringify(value).length,
      },
    });

    return json({ ok: true, key, action: "upsert" });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
