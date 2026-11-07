// GLOWNESS SHOP — Web Push untuk notifikasi pesanan admin
// Deploy: supabase functions deploy admin-push --no-verify-jwt
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY,
//          VAPID_PRIVATE_KEY, VAPID_SUBJECT (contoh: mailto:admin@example.com)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
    const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";
    if (!url || !serviceKey || !publicKey || !privateKey) {
      return json({ error: "Push server belum dikonfigurasi (VAPID/Supabase secrets)." }, 503);
    }

    const db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const body = await req.json();
    const action = String(body?.action || "");

    if (action === "subscribe") {
      const sub = body?.subscription;
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
        return json({ error: "Subscription tidak valid." }, 400);
      }
      if (!String(sub.endpoint).startsWith("https://")) {
        return json({ error: "Endpoint harus HTTPS." }, 400);
      }
      const { error } = await db.from("admin_push_subscriptions").upsert({
        endpoint: sub.endpoint,
        subscription: sub,
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "unsubscribe") {
      const endpoint = String(body?.endpoint || "");
      if (!endpoint) return json({ error: "Endpoint wajib diisi." }, 400);
      const { error } = await db.from("admin_push_subscriptions").delete().eq("endpoint", endpoint);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "notify-order") {
      const orderId = String(body?.orderId || "");
      if (!orderId || orderId.length > 120) return json({ error: "Order ID tidak valid." }, 400);

      // Pastikan order benar-benar tersimpan di cloud sebelum mengirim push.
      const { data: stored, error: readError } = await db
        .from("app_storage").select("value").eq("key", "oliv_orders").maybeSingle();
      if (readError) throw readError;
      const orders = Array.isArray(stored?.value) ? stored.value : [];
      const orderExists = orders.some((o: any) => String(o?.id || "") === orderId);
      if (!orderExists) return json({ error: "Pesanan belum ditemukan di cloud." }, 404);

      // Deduplikasi agar refresh/retry tidak mengirim notifikasi berulang.
      const { error: claimError } = await db.from("admin_push_sent").insert({ order_id: orderId });
      if (claimError) {
        if (String(claimError.code) === "23505") return json({ ok: true, duplicate: true });
        throw claimError;
      }

      webpush.setVapidDetails(subject, publicKey, privateKey);
      const { data: rows, error: listError } = await db
        .from("admin_push_subscriptions").select("endpoint, subscription");
      if (listError) throw listError;

      const payload = JSON.stringify({
        title: "Pesanan baru — GLOWNESS SHOP",
        body: "Ada transaksi/pesanan baru. Ketuk untuk membuka halaman pesanan admin.",
        url: "#/portal/pesanan",
        tag: "gl-order-" + orderId,
        type: "order",
      });

      let sent = 0;
      const stale: string[] = [];
      for (const row of (rows || [])) {
        try {
          await webpush.sendNotification(row.subscription, payload, { TTL: 60 * 60 });
          sent++;
        } catch (err: any) {
          const status = Number(err?.statusCode || 0);
          if (status === 404 || status === 410) stale.push(row.endpoint);
          else console.error("Push delivery failed:", status, err?.message || err);
        }
      }
      if (stale.length) {
        await db.from("admin_push_subscriptions").delete().in("endpoint", stale);
      }
      return json({ ok: true, sent });
    }

    return json({ error: "Action tidak dikenal." }, 400);
  } catch (error: any) {
    console.error("admin-push:", error);
    return json({ error: error?.message || "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
