import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Search, Users, MessageSquare, BarChart3, Globe,
  ArrowRight, CheckCircle2, Zap, Shield, Target, TrendingUp,
  Building2, ShoppingBag, Briefcase, Truck, Laptop, Home,
  Send, Phone, Mail, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarfieldBackground } from "@/components/StarfieldBackground";
import logoImg from "@/assets/logo.png";

/* ───── animation helpers ───── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};
const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

function Section({ children, className = "", id = "" }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ───── count-up component ───── */
function CountUpStat({
  end, suffix, format,
}: { end: number; suffix: string; format: "plain" | "pt" }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const raw = useMotionValue(0);
  const spring = useSpring(raw, { stiffness: 60, damping: 20, restDelta: 0.5 });
  const display = useTransform(spring, (v) => {
    const n = Math.round(v);
    return format === "pt"
      ? `${n.toLocaleString("pt-PT")}${suffix}`
      : `${n}${suffix}`;
  });

  useEffect(() => {
    if (isInView) raw.set(end);
  }, [isInView, end, raw]);

  return <motion.span ref={ref}>{display}</motion.span>;
}

/* ───── data ───── */
const stats = [
  { icon: Search, end: 50, suffix: "K+", label: "Pesquisas Realizadas", format: "plain" as const },
  { icon: Users, end: 2500, suffix: "+", label: "Leads Capturados", format: "pt" as const },
  { icon: TrendingUp, end: 98, suffix: "%", label: "Taxa de Precisão", format: "plain" as const },
];

const features = [
  {
    num: "01",
    title: "Prospecção Inteligente",
    desc: "Pesquise empresas automaticamente nas redes sociais e na web. O nosso motor identifica perfis de negócio reais, não publicações isoladas.",
  },
  {
    num: "02",
    title: "Gestão de Leads Completa",
    desc: "Organize os seus contactos com pipeline visual, notas, histórico de interações e acompanhamento de cada etapa do funil de vendas.",
  },
  {
    num: "03",
    title: "Mensagens Personalizadas",
    desc: "Crie e envie mensagens profissionais usando templates dinâmicos. Acompanhe cada comunicação com os seus potenciais clientes.",
  },
];

const verticals = [
  { icon: Building2, label: "Imobiliário" },
  { icon: ShoppingBag, label: "Comércio" },
  { icon: Briefcase, label: "Consultoria" },
  { icon: Truck, label: "Logística" },
  { icon: Laptop, label: "Tecnologia" },
  { icon: Home, label: "Construção" },
];

const plans = [
  {
    name: "Starter",
    price: "10.000",
    currency: "Kz",
    period: "/mês",
    desc: "Ideal para freelancers e pequenos negócios",
    features: [
      "5 pesquisas por semana",
      "28 pesquisas por mês",
      "Gestão de leads",
      "Templates de mensagens",
      "Suporte por email",
    ],
    popular: false,
  },
  {
    name: "Pro",
    price: "20.000",
    currency: "Kz",
    period: "/mês",
    desc: "Para equipas de vendas em crescimento",
    features: [
      "21 pesquisas por semana",
      "84 pesquisas por mês",
      "Carry-over de tokens não usados",
      "Leads ilimitados",
      "Templates personalizados",
      "Exportação de leads (CSV)",
      "Suporte prioritário",
    ],
    popular: true,
  },
  {
    name: "Business",
    price: "35.000",
    currency: "Kz",
    period: "/mês",
    desc: "Para agências e grandes equipas comerciais",
    features: [
      "64 pesquisas por semana",
      "253 pesquisas por mês",
      "Carry-over de tokens não usados",
      "Leads ilimitados",
      "Multi-utilizadores",
      "Relatórios avançados",
      "Gestor de conta dedicado",
    ],
    popular: false,
  },
];

const navItems = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Sectores", href: "#sectores" },
  { label: "Preços", href: "#precos" },
];

/* ═══════════════════════════════════════ */
/* ░░░  LANDING PAGE  ░░░ */
/* ═══════════════════════════════════════ */
const LandingPage = () => {
  useEffect(() => {
    document.title = "ProspectEz — Prospecção Inteligente de Clientes em Angola";
  }, []);

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      <StarfieldBackground count={120} />

      {/* ─── NAV ─── */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 lg:px-20 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center glow-primary">
            <img src={logoImg} alt="ProspectEz" className="h-6 w-6" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            ProspectEz
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-full border border-transparent hover:border-border/50 transition-all"
            >
              {item.label}
            </a>
          ))}
        </div>

        <Link to="/login">
          <Button variant="outline" className="rounded-full border-border/50 hover:border-primary/50 hover:bg-primary/5">
            Entrar
          </Button>
        </Link>
      </nav>

      {/* ─── HERO ─── */}
      <Section className="relative z-10 px-6 md:px-12 lg:px-20 pt-16 md:pt-24 pb-20 md:pb-32 text-center">
        <motion.div variants={fadeUp} className="max-w-4xl mx-auto">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Encontre{" "}
            <span className="relative inline-block">
              <span className="relative z-10 gradient-text">Clientes Ideais</span>
              <span className="absolute inset-0 border-2 border-primary/40 rounded-lg -m-1" />
              <span className="absolute -top-2 -right-3 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <Zap className="h-2.5 w-2.5" /> IA
              </span>
            </span>
            <br />
            com Prospecção Automática
          </h1>
        </motion.div>

        <motion.p variants={fadeUp} className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Automatize a descoberta de empresas em Angola e transforme a sua prospecção comercial — das redes sociais à web, do primeiro contacto ao fecho do negócio.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/registar">
            <Button size="lg" className="rounded-full h-13 px-8 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground glow-primary">
              Começar Gratuitamente <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

        {/* client logos / trust badges */}
        <motion.div variants={fadeUp} className="mt-20">
          <p className="text-sm text-muted-foreground mb-8 uppercase tracking-widest">Pensado para empresas angolanas</p>
          <div className="flex items-center justify-center gap-8 md:gap-14 opacity-40">
            {["Luanda", "Benguela", "Huambo", "Cabinda"].map((city) => (
              <span key={city} className="text-lg md:text-xl font-bold tracking-wider text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {city}
              </span>
            ))}
          </div>
        </motion.div>
      </Section>

      {/* ─── STATS ─── */}
      <Section className="relative z-10 px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-start mb-14">
            <motion.h2
              variants={fadeUp}
              className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Plataforma Completa de{" "}
              <span className="relative inline-flex items-center gap-2">
                <span className="bg-primary/20 rounded-full p-1.5"><Target className="h-5 w-5 text-primary" /></span>
              </span>{" "}
              Prospecção
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-base md:text-lg leading-relaxed">
              Pesquisas activas em todas as províncias de Angola, alcançando milhares de empresas e profissionais todos os meses.
            </motion.p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={scaleIn}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="relative group rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-8 overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-colors duration-300"
                style={{ willChange: "transform" }}
              >
                {/* subtle arc background */}
                <div className="absolute inset-0 opacity-[0.03]">
                  <div className="absolute inset-0 rounded-full border border-foreground/20 scale-150 translate-y-1/2" />
                  <div className="absolute inset-0 rounded-full border border-foreground/10 scale-[2] translate-y-1/2" />
                </div>
                {/* glow on hover */}
                <motion.div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "radial-gradient(circle at 30% 30%, hsl(var(--primary)/0.06), transparent 70%)" }}
                />
                <div className="relative z-10">
                  <motion.div
                    className="bg-primary/10 rounded-xl p-2.5 w-fit mb-6"
                    whileHover={{ scale: 1.15, rotate: 8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <stat.icon className="h-5 w-5 text-primary" />
                  </motion.div>
                  <div className="text-4xl md:text-5xl font-bold text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <CountUpStat end={stat.end} suffix={stat.suffix} format={stat.format} />
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── FEATURES (numbered) ─── */}
      <Section id="funcionalidades" className="relative z-10 px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <motion.span variants={fadeUp} className="text-sm text-primary font-semibold uppercase tracking-wider">
              Funcionalidades
            </motion.span>
            <motion.h2
              variants={fadeUp}
              className="mt-3 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Abordagem Orientada a <span className="gradient-text">Resultados</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-muted-foreground leading-relaxed">
              Alinhamos a prospecção com métricas de custo por lead, ajudando a identificar os mercados mais eficazes para a promoção do seu negócio.
            </motion.p>

            <div className="mt-10 space-y-8">
              {features.map((f) => (
                <motion.div key={f.num} variants={fadeUp} className="group">
                  <div className="flex items-start gap-4">
                    <span className="text-2xl font-bold text-primary/60 group-hover:text-primary transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {f.num}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* decorative 3D-like element */}
          <motion.div variants={scaleIn} className="hidden md:flex items-center justify-center">
            <div className="relative w-72 h-72 lg:w-96 lg:h-96">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full border border-primary/20"
                  style={{
                    width: `${60 + i * 20}%`,
                    height: `${60 + i * 20}%`,
                    top: `${20 - i * 10}%`,
                    left: `${20 - i * 10}%`,
                    background: `radial-gradient(ellipse at ${50 + i * 5}% ${40 + i * 5}%, hsl(var(--primary) / ${0.15 - i * 0.02}), transparent 70%)`,
                    transform: `rotate(${i * 30}deg)`,
                  }}
                />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center glow-primary">
                  <Search className="h-10 w-10 text-primary" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ─── SECOND FEATURE BLOCK ─── */}
      <Section className="relative z-10 px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* decorative element left */}
          <motion.div variants={scaleIn} className="hidden md:flex items-center justify-center">
            <div className="relative w-64 h-80 lg:w-80 lg:h-96">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-[40%] border border-primary/15"
                  style={{
                    width: `${50 + i * 15}%`,
                    height: `${30 + i * 12}%`,
                    top: `${10 + i * 14}%`,
                    left: `${25 - i * 5}%`,
                    background: `linear-gradient(${135 + i * 25}deg, hsl(var(--primary) / ${0.12 - i * 0.02}), transparent 60%)`,
                    transform: `rotate(${-10 + i * 8}deg)`,
                  }}
                />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-2xl bg-primary/20 backdrop-blur-md flex items-center justify-center glow-primary">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
              </div>
            </div>
          </motion.div>

          <div>
            <motion.span variants={fadeUp} className="text-sm text-primary font-semibold uppercase tracking-wider">
              Comunicação
            </motion.span>
            <motion.h2
              variants={fadeUp}
              className="mt-3 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Desenvolvemos Estratégias de{" "}
              <span className="relative inline-flex items-center gap-2">
                <span className="bg-primary/20 rounded-full p-1.5"><BarChart3 className="h-5 w-5 text-primary" /></span>
              </span>{" "}
              Entrada no Mercado
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-muted-foreground leading-relaxed">
              Ajudamos a encontrar clientes, construir confiança em torno do seu produto e lançar abordagens comerciais orientadas a performance em colaboração com múltiplos canais.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8">
              <Link to="/registar">
                <Button variant="outline" className="rounded-full border-border/50 hover:border-primary/50 gap-2">
                  Contactar <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ─── VERTICALS / SECTORS ─── */}
      <Section id="sectores" className="relative z-10 px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-start mb-16">
            <motion.h2
              variants={fadeUp}
              className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Compreendemos Como Funcionam os{" "}
              <span className="inline-flex items-center gap-1.5">
                Negócios
                <span className="bg-primary/20 rounded-full p-1"><TrendingUp className="h-4 w-4 text-primary" /></span>
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-base md:text-lg leading-relaxed">
              Com experiência em diversos sectores, sabemos como colaborar eficazmente com empresas de todas as dimensões em Angola.
            </motion.p>
          </div>

          {/* arc layout */}
          <div className="relative">
            {/* decorative arcs */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[600px] h-[600px] md:w-[800px] md:h-[800px]">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="absolute rounded-full border border-border/30"
                    style={{
                      width: `${50 + i * 25}%`,
                      height: `${50 + i * 25}%`,
                      bottom: `-${i * 15}%`,
                      left: `${25 - i * 12.5}%`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-3xl mx-auto">
              {verticals.map((v, i) => (
                <motion.div
                  key={v.label}
                  variants={scaleIn}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 bg-card/70 backdrop-blur-sm border border-border/50 rounded-xl px-5 py-4 hover:border-primary/30 transition-all duration-300"
                >
                  <v.icon className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground">{v.label}</span>
                </motion.div>
              ))}
            </div>

            {/* center badge */}
            <motion.div variants={scaleIn} className="flex justify-center mt-8">
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-5 py-2.5 text-sm text-primary font-medium">
                <Target className="h-4 w-4" /> Prospecção Inteligente
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ─── PRICING ─── */}
      <Section id="precos" className="relative z-10 px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <span className="text-sm text-primary font-semibold uppercase tracking-wider">Preços</span>
            <h2
              className="mt-3 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Planos Simples e <span className="gradient-text">Transparentes</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Escolha o plano que melhor se adapta ao tamanho da sua equipa e às suas necessidades de prospecção.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                variants={scaleIn}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl border p-8 flex flex-col transition-all duration-500 ${
                  plan.popular
                    ? "border-primary/50 bg-primary/5 shadow-[0_0_40px_hsl(var(--primary)/0.1)]"
                    : "border-border/50 bg-card/60 backdrop-blur-sm hover:border-primary/30"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                    Mais Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
                </div>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {plan.currency}{plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/registar" className="w-full">
                  <Button
                    className={`w-full rounded-full h-11 font-semibold ${
                      plan.popular
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground glow-primary"
                        : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                    }`}
                  >
                    Começar Agora
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 border-t border-border/30 px-6 md:px-12 lg:px-20 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <img src={logoImg} alt="ProspectEz" className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                ProspectEz
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-5 text-sm text-muted-foreground">
              {navItems.map((item) => (
                <a key={item.label} href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground mr-2">Social</span>
            <a href="#" className="h-9 w-9 rounded-full bg-card border border-border/50 flex items-center justify-center hover:border-primary/50 transition-colors">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </a>
            <a href="#" className="h-9 w-9 rounded-full bg-card border border-border/50 flex items-center justify-center hover:border-primary/50 transition-colors">
              <Send className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-border/20 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ProspectEz. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
