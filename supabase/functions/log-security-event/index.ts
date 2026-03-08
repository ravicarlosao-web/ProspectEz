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
    const { event_type, email, details } = await req.json();

    if (!event_type || typeof event_type !== "string") {
      return new Response(JSON.stringify({ error: "event_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract IP and user agent from request
    const ip_address =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const user_agent = req.headers.get("user-agent") || "unknown";

    // Sanitize email
    const sanitizedEmail = email
      ? String(email).slice(0, 255).toLowerCase().trim()
      : null;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabaseAdmin.from("security_logs").insert({
      event_type: String(event_type).slice(0, 100),
      email: sanitizedEmail,
      ip_address: String(ip_address).slice(0, 45),
      user_agent: String(user_agent).slice(0, 500),
      details: details || {},
    });

    if (error) {
      console.error("Failed to insert security log:", error);
      return new Response(JSON.stringify({ error: "Failed to log event" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Security log error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
