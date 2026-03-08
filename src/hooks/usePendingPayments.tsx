import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePendingPayments() {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    const { count: c, error } = await supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente");

    if (!error && c !== null) {
      setCount(c);
    }
  };

  useEffect(() => {
    fetchCount();

    const channel = supabase
      .channel("pending-payments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
