import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find approved/rejected payments older than 7 days with receipt files
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: payments, error: fetchError } = await supabase
      .from("payments")
      .select("id, receipt_url, status")
      .in("status", ["aprovado", "rejeitado"])
      .not("receipt_url", "is", null)
      .lt("created_at", sevenDaysAgo.toISOString());

    if (fetchError) {
      throw fetchError;
    }

    if (!payments || payments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No receipts to clean up", deleted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete files from storage
    const filePaths = payments
      .map((p) => p.receipt_url)
      .filter(Boolean) as string[];

    if (filePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("payment-receipts")
        .remove(filePaths);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }
    }

    // Clear receipt_url from payment records (keep the payment record itself)
    const paymentIds = payments.map((p) => p.id);
    const { error: updateError } = await supabase
      .from("payments")
      .update({ receipt_url: null })
      .in("id", paymentIds);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    const result = {
      message: `Cleaned up ${filePaths.length} receipt(s)`,
      deleted: filePaths.length,
    };

    console.log(result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
