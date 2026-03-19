import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanConfig = {
  name: string;
  key: string;
  daily: number;
  weekly: number;
  monthly: number;
  priceKz: number;
  priceUsd: number;
};

export type TokenPackage = {
  name: string;
  quantity: number;
  priceKz: number;
  priceUsd: number;
};

export type PaymentMethodConfig = {
  value: string;
  label: string;
  details: string;
};

export const DEFAULT_PLANS: PlanConfig[] = [
  { name: "Free",     key: "free",     daily: 10,  weekly: 10,  monthly: 10,   priceKz: 0,     priceUsd: 0  },
  { name: "Starter",  key: "starter",  daily: 50,  weekly: 50,  monthly: 280,  priceKz: 10000, priceUsd: 10 },
  { name: "Pro",      key: "pro",      daily: 70,  weekly: 210, monthly: 840,  priceKz: 20000, priceUsd: 20 },
  { name: "Business", key: "business", daily: 100, weekly: 631, monthly: 2526, priceKz: 35000, priceUsd: 35 },
];

export const DEFAULT_PACKAGES: TokenPackage[] = [
  { name: "Mini",   quantity: 50,  priceKz: 2000,  priceUsd: 2  },
  { name: "Médio",  quantity: 150, priceKz: 6000,  priceUsd: 6  },
  { name: "Grande", quantity: 300, priceKz: 10000, priceUsd: 10 },
];

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  { value: "transferencia", label: "Transferência Bancária", details: "IBAN: AO06 0040 0000 1234 5678 9012 3" },
  { value: "multicaixa",   label: "Multicaixa Express",     details: "Referência: 12345 | Entidade: 12345"   },
];

export function usePlanConfigs() {
  const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLANS);
  const [packages, setPackages] = useState<TokenPackage[]>(DEFAULT_PACKAGES);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(DEFAULT_PAYMENT_METHODS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["plan_configs", "token_packages", "payment_methods"]);

      if (data) {
        const planRow = data.find((r: any) => r.key === "plan_configs");
        const pkgRow  = data.find((r: any) => r.key === "token_packages");
        const pmRow   = data.find((r: any) => r.key === "payment_methods");
        if (planRow) try { setPlans(JSON.parse(planRow.value)); }          catch {}
        if (pkgRow)  try { setPackages(JSON.parse(pkgRow.value)); }        catch {}
        if (pmRow)   try { setPaymentMethods(JSON.parse(pmRow.value)); }   catch {}
      }
      setLoading(false);
    };
    load();
  }, []);

  const getPlanByKey = (key: string): PlanConfig | undefined =>
    plans.find(p => p.key === key);

  return { plans, packages, paymentMethods, loading, getPlanByKey };
}
