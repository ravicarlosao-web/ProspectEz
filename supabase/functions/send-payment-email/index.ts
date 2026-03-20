import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

const PLAN_DETAILS: Record<string, { weekly: number; monthly: number }> = {
  starter:  { weekly: 5,  monthly: 28  },
  pro:      { weekly: 21, monthly: 84  },
  business: { weekly: 64, monthly: 253 },
};

function buildEmailHtml(opts: {
  name: string;
  planLabel: string;
  weekly: number;
  monthly: number;
  amountKz: number;
}): string {
  const { name, planLabel, weekly, monthly, amountKz } = opts;
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Pagamento Aprovado — ProspectEz</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:16px;border:1px solid #222;overflow:hidden;max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:#111;padding:32px 40px 24px;border-bottom:1px solid #1e1e1e;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="background:#22c55e;width:36px;height:36px;border-radius:10px;display:inline-block;vertical-align:middle;"></div>
                <span style="font-size:20px;font-weight:700;color:#ffffff;vertical-align:middle;margin-left:10px;">ProspectEz</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <!-- Success icon -->
              <div style="text-align:center;margin-bottom:28px;">
                <div style="display:inline-block;background:#22c55e20;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;">✅</div>
              </div>

              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;text-align:center;">Pagamento Aprovado!</h1>
              <p style="margin:0 0 32px;font-size:15px;color:#888;text-align:center;">O seu pagamento foi confirmado com sucesso.</p>

              <p style="margin:0 0 24px;font-size:15px;color:#d4d4d4;">Olá <strong style="color:#ffffff;">${name}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#d4d4d4;line-height:1.6;">
                Temos o prazer de confirmar que o seu pagamento foi <strong style="color:#22c55e;">aprovado</strong> e o seu plano já está activo na plataforma ProspectEz.
              </p>

              <!-- Plan card -->
              <div style="background:#0f1f12;border:1px solid #22c55e40;border-radius:12px;padding:24px;margin-bottom:24px;">
                <p style="margin:0 0 4px;font-size:12px;color:#22c55e;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Plano Activado</p>
                <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff;">${planLabel}</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:13px;color:#888;padding:4px 0;">Pesquisas por semana</td>
                    <td style="font-size:13px;color:#ffffff;font-weight:600;text-align:right;">${weekly}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#888;padding:4px 0;">Pesquisas por mês</td>
                    <td style="font-size:13px;color:#ffffff;font-weight:600;text-align:right;">${monthly}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#888;padding:4px 0;border-top:1px solid #1e1e1e;padding-top:12px;margin-top:8px;">Valor pago</td>
                    <td style="font-size:13px;color:#22c55e;font-weight:700;text-align:right;border-top:1px solid #1e1e1e;padding-top:12px;">${amountKz.toLocaleString("pt-PT")} Kz</td>
                  </tr>
                </table>
              </div>

              <p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.6;">
                Tokens não utilizados numa semana acumulam-se e são distribuídos pelas semanas restantes do mês (sistema de carry-over).
              </p>

              <!-- CTA button -->
              <div style="text-align:center;margin-bottom:32px;">
                <a href="https://prospectez.com/dashboard" style="display:inline-block;background:#22c55e;color:#000000;font-size:15px;font-weight:700;padding:14px 36px;border-radius:100px;text-decoration:none;">
                  Ir para o Dashboard →
                </a>
              </div>

              <p style="margin:0;font-size:14px;color:#555;text-align:center;">
                Se tiver alguma questão, responda a este email ou contacte o suporte.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0d0d0d;padding:20px 40px;border-top:1px solid #1e1e1e;text-align:center;">
              <p style="margin:0;font-size:12px;color:#444;">© 2026 ProspectEz · Angola</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, user_email, user_name, plan_key, amount_kz } = await req.json();

    if (!user_email) {
      return new Response(JSON.stringify({ error: "user_email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY not set");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planLabel = PLAN_LABELS[plan_key] ?? plan_key ?? "Premium";
    const planDetails = PLAN_DETAILS[plan_key] ?? { weekly: 0, monthly: 0 };
    const firstName = (user_name || "Utilizador").split(" ")[0];

    const html = buildEmailHtml({
      name: firstName,
      planLabel,
      weekly: planDetails.weekly,
      monthly: planDetails.monthly,
      amountKz: amount_kz ?? 0,
    });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ProspectEz <noreply@prospectez.com>",
        to: [user_email],
        subject: `✅ Pagamento aprovado — Plano ${planLabel} activado!`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const body = await emailRes.text();
      console.error("Resend error:", body);
      return new Response(JSON.stringify({ error: "Failed to send email", detail: body }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await emailRes.json();
    console.log("Email sent:", result.id);

    return new Response(JSON.stringify({ success: true, email_id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-payment-email error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
