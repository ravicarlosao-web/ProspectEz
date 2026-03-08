export const PROVINCES_ANGOLA = [
  "Bengo", "Benguela", "Bié", "Cabinda", "Cuando Cubango",
  "Cuanza Norte", "Cuanza Sul", "Cunene", "Huambo", "Huíla",
  "Luanda", "Lunda Norte", "Lunda Sul", "Malanje", "Moxico",
  "Namibe", "Uíge", "Zaire"
] as const;

export const LEAD_STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  contactado: "Contactado",
  em_negociacao: "Em Negociação",
  fechado_ganho: "Fechado Ganho",
  perdido: "Perdido",
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  novo: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  contactado: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  em_negociacao: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  fechado_ganho: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  perdido: "bg-red-500/15 text-red-400 border-red-500/20",
};

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  social_media: "Social Media",
  website: "Website",
  ambos: "Ambos",
};

export const MESSAGE_CATEGORIES = [
  { value: "inicial", label: "Mensagem Inicial" },
  { value: "follow_up_1", label: "Follow-up 1" },
  { value: "follow_up_2", label: "Follow-up 2" },
  { value: "reuniao", label: "Proposta de Reunião" },
  { value: "agradecimento", label: "Agradecimento" },
  { value: "abandono", label: "Abandono de Lead" },
  { value: "social_analise", label: "Análise Social Media" },
  { value: "social_crescimento", label: "Crescimento Social" },
  { value: "social_conteudo", label: "Conteúdo Profissional" },
  { value: "social_roi", label: "ROI Social Media" },
  { value: "social_sem_presenca", label: "Sem Presença Digital" },
] as const;
