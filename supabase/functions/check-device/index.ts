import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { fingerprint, action, email, user_id } = body;

    if (!fingerprint || typeof fingerprint !== "string" || fingerprint.length < 10) {
      return new Response(
        JSON.stringify({ error: "Invalid fingerprint" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (action === "check") {
      // Check fingerprint
      const { data: byFingerprint } = await supabase
        .from("device_registrations")
        .select("id, email, created_at")
        .eq("fingerprint", fingerprint)
        .limit(1);

      if (byFingerprint && byFingerprint.length > 0) {
        const masked = byFingerprint[0].email
          ? byFingerprint[0].email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
          : null;
        return new Response(
          JSON.stringify({ blocked: true, reason: "fingerprint", registered_email: masked }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check IP
      if (ip !== "unknown") {
        const { data: byIp } = await supabase
          .from("device_registrations")
          .select("id, email, created_at")
          .eq("ip_address", ip)
          .limit(1);

        if (byIp && byIp.length > 0) {
          const masked = byIp[0].email
            ? byIp[0].email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
            : null;
          return new Response(
            JSON.stringify({ blocked: true, reason: "ip", registered_email: masked }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ blocked: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "register") {
      await supabase.from("device_registrations").insert({
        fingerprint,
        ip_address: ip,
        email: email || null,
        user_id: user_id || null,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-device error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
