// GLOWNESS SHOP — Edge Function: buat snapshot backup
// Deploy: supabase functions deploy backup-create --no-verify-jwt
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STORAGE_WRITE_SECRET
// Jadwalkan harian di Supabase Dashboard → Edge Functions → Schedules (cron)

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

    let label = "auto-" + new Date().toISOString();
    try {
      const body = await req.json();
      if (body?.label) label = String(body.label).slice(0, 120);
    } catch (_) {}

    const url = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!url || !serviceKey) {
      return json({ error: "Server misconfigured" }, 500);
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: id, error } = await admin.rpc("create_app_backup", {
      p_label: label,
    });
    if (error) return json({ error: error.message }, 500);

    // pangkas backup lama (simpan 30 terakhir)
    await admin.rpc("prune_app_backups", { keep_n: 30 });

    return json({ ok: true, backup_id: id, label });
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
