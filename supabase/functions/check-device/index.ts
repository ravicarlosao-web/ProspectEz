// Anti-abuse device check v2 - with disposable email, rate limiting, persistent tokens
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Disposable email domains (expanded list including tempmail.com generators)
const DISPOSABLE_DOMAINS = new Set([
  // Classic disposable providers
  "mailinator.com","guerrillamail.com","guerrillamail.net","tempmail.com","throwaway.email",
  "yopmail.com","sharklasers.com","guerrillamailblock.com","grr.la","discard.email",
  "temp-mail.org","fakeinbox.com","mailnesia.com","trashmail.com","trashmail.net",
  "trashmail.org","tmpmail.net","tmpmail.org","binkmail.com","getairmail.com",
  "maildrop.cc","mohmal.com","tempail.com","tempmailaddress.com","tempr.email",
  "10minutemail.com","10minutemail.net","minutemail.com","emailondeck.com","guerrillamail.de",
  "harakirimail.com","jetable.org","mailexpire.com","mailcatch.com","nospam.ze.tc",
  "owlpic.com","spamgourmet.com","trashymail.com","mytrashmail.com","mailnator.com",
  "mailtemp.info","mt2015.com","thankyou2010.com","trash2009.com","boun.cr",
  "filzmail.com","mailforspam.com","safetymail.info","spoofmail.de","tempinbox.com",
  "tempomail.fr","temporaryemail.net","throwam.com","trashmailer.com","wegwerfmail.de",
  "wegwerfmail.net","einrot.com","0815.ru","0clickemail.com","bccto.me",
  "bobmail.info","chammy.info","devnullmail.com","discardmail.com","discardmail.de",
  "e4ward.com","emailmiser.com","emailsensei.com","emailtemporario.com.br","fakedemail.com",
  "gishpuppy.com","kasmail.com","klzlk.com","lhsdv.com","mailblocks.com",
  "mailimate.com","mailmoat.com","mailseal.de","meltmail.com",
  "mintemail.com","mytempemail.com","nobulk.com","noclickemail.com","nogmailspam.info",
  "nomail.xl.cx","nomail2me.com","nospamfor.us","nowmymail.com",
  "pjjkp.com","pookmail.com","recode.me","regbypass.com","rejectmail.com",
  "safe-mail.net","safersignup.de","safetypost.de","shieldedmail.com","sogetthis.com",
  "soodonims.com","spamcero.com","spamcon.org","spamex.com","spamfree24.com",
  "spamfree24.de","spamfree24.net","spamfree24.org","spamgoes.in","spaml.com",
  "spammotel.com","spamobox.com","spamoff.de","spamspot.com","spamthisplease.com",
  "tempemail.co.za","tempemail.net","tempinbox.co.uk","tempmail.it","tempmailer.com",
  "tempmailer.de","temporarily.de","temporarioemail.com.br",
  "temporaryemail.us","temporaryforwarding.com","temporaryinbox.com",
  "thisisnotmyrealemail.com","throwawayemailaddress.com","tittbit.in","tradermail.info",
  "trashmail.at","trashmail.me","trashmail.ws","uggsrock.com",
  "veryreallybadmail.com","viditag.com","whyspam.me","willselfdestruct.com",
  "xyzfree.net","yopmail.fr","yopmail.net","za.com","zehnminutenmail.de",
  "zippymail.info","mailsac.com","mailtothis.com","burnthismail.com",
  "imgof.com","imstations.com","incognitomail.org","insorg.org",
  // TempMail / temp-mail.org generated domains (rotate frequently)
  "keecs.com","nezid.com","cyclelove.cc","inboxbear.com","mailto.plus",
  "fexpost.com","esmoud.com","knowledgemd.com","tenvil.com","rungel.com",
  "jiooq.com","dromund.com","csjza.com","vintomaper.com","breazs.com",
  "emlhub.com","finews.biz","emlpro.com","fuioj.com","rsjhi.com",
  "labworld.org","gufum.com","txcct.com","cevav.com","kzccv.com",
  "exdonuts.com","inboxes.com","getmule.com","temil.com","logicstreak.com",
  "nqmo.com","dcctb.com","rteet.com","1secmail.com","1secmail.net","1secmail.org",
  "ezztt.com","vjuum.com","laafd.com","txoof.com","rfcdrive.com",
  "tmmbt.net","tmmcv.net","tmpmail.org","tmpmailtor.com",
  // Guerrilla Mail variants
  "guerrillamail.info","guerrillamailblock.com","pokemail.net","spam4.me",
  // Other popular temp services
  "tempmailo.com","emailfake.com","generator.email","guerrillamail.biz",
  "guerrillamail.org","crazymailing.com","disposableemailaddresses.emailmiser.com",
  "emkei.cz","fakemailgenerator.com","tempmail.ninja","tempmail.dev",
  "tempmail.plus","temp-mail.io","temp-mail.live","emailnax.com",
  "burnermail.io","guerrillamail.com","mailgw.com","moakt.com","moakt.ws",
  "mytemp.email","throwmail.com","tmpbox.net","tmpmail.net",
  // Russian/CIS temp mail
  "dropmail.me","mailfa.tk","mail-temporaire.fr","mohmal.im","mohmal.in",
  "emailna.co","email-fake.com","cmail.net","cmail.org",
]);

async function isDisposableEmail(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  
  // 1. Check static list first (instant)
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  
  // 2. Fallback: check via free disposable email API
  try {
    const res = await fetch(`https://disposable.debounce.io/?email=${encodeURIComponent(email)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.disposable === "true" || data.disposable === true;
    }
  } catch {
    // API timeout/error — rely on static list only
  }
  
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { fingerprint, action, email, user_id, persistent_token } = body;

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
      // 1. Check persistent token (survives incognito/browser changes if any storage persists)
      if (persistent_token && typeof persistent_token === "string" && persistent_token.length > 10) {
        const { data: byToken } = await supabase
          .from("device_registrations")
          .select("id, email")
          .eq("persistent_token", persistent_token)
          .limit(1);

        if (byToken && byToken.length > 0) {
          const masked = byToken[0].email
            ? byToken[0].email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
            : null;
          return new Response(
            JSON.stringify({ blocked: true, reason: "token", registered_email: masked }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // 2. Check fingerprint
      const { data: byFingerprint } = await supabase
        .from("device_registrations")
        .select("id, email")
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

      // 3. Check IP
      if (ip !== "unknown") {
        const { data: byIp } = await supabase
          .from("device_registrations")
          .select("id, email")
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

      // 4. Rate limiting: max 3 attempts per IP in last hour
      if (ip !== "unknown") {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("registration_attempts")
          .select("id", { count: "exact", head: true })
          .eq("ip_address", ip)
          .gte("created_at", oneHourAgo);

        if (count !== null && count >= 3) {
          return new Response(
            JSON.stringify({ blocked: true, reason: "rate_limit", registered_email: null }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ blocked: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check_email") {
      // Check disposable email
      if (email && await isDisposableEmail(email)) {
        return new Response(
          JSON.stringify({ blocked: true, reason: "disposable_email" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ blocked: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "log_attempt") {
      // Log registration attempt for rate limiting
      await supabase.from("registration_attempts").insert({
        ip_address: ip,
        fingerprint,
        email: email || null,
      });
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "register") {
      await supabase.from("device_registrations").insert({
        fingerprint,
        ip_address: ip,
        email: email || null,
        user_id: user_id || null,
        persistent_token: persistent_token || null,
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
