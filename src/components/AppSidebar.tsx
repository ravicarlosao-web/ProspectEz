import {
  LayoutDashboard, Users, Search, MessageSquare, Settings, LogOut, Zap, Shield,
  BarChart3, UserCog, CreditCard, FileText, ClipboardCheck, Wallet, Flame, ShieldAlert
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { motion } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Painel", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Prospecção", url: "/prospeccao", icon: Search },
  { title: "Mensagens", url: "/mensagens", icon: MessageSquare },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

const adminItems = [
  { title: "Visão Geral", url: "/admin", icon: BarChart3 },
  { title: "Utilizadores", url: "/admin/utilizadores", icon: UserCog },
  { title: "Planos", url: "/admin/planos", icon: CreditCard },
  { title: "Financeiro", url: "/admin/financeiro", icon: Wallet },
  { title: "Logs", url: "/admin/logs", icon: FileText },
  { title: "Auditoria", url: "/admin/auditoria", icon: ClipboardCheck },
  { title: "Templates", url: "/admin/templates", icon: MessageSquare },
  { title: "Firecrawl", url: "/admin/firecrawl", icon: Flame },
  { title: "Segurança", url: "/admin/seguranca", icon: ShieldAlert },
];

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.1 + i * 0.06, duration: 0.35, ease: "easeOut" as const },
  }),
};

export function AppSidebar() {
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();

  return (
    <Sidebar className="border-r-0">
      <motion.div
        className="flex items-center gap-3 px-5 py-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary glow-primary">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-sidebar-foreground">ProspectEz</span>
          <span className="text-[11px] text-sidebar-foreground/40">Prospecção</span>
        </div>
      </motion.div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/30 text-[10px] uppercase tracking-[0.15em] font-semibold mb-1">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item, i) => (
                <motion.div key={item.title} custom={i} initial="hidden" animate="visible" variants={itemVariants}>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/60 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-primary font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-primary"
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                        <span className="text-[13px]">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </motion.div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/30 text-[10px] uppercase tracking-[0.15em] font-semibold mb-1">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                Administração
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item, i) => (
                  <motion.div key={item.title} custom={i + menuItems.length} initial="hidden" animate="visible" variants={itemVariants}>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end
                          className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/60 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          activeClassName="bg-sidebar-accent text-primary font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-primary"
                        >
                          <item.icon className="h-[18px] w-[18px]" />
                          <span className="text-[13px]">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </motion.div>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.35 }}
          className="flex items-center gap-2.5 rounded-xl bg-sidebar-accent/60 px-3 py-2.5"
        >
          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold">
            {user?.email?.[0]?.toUpperCase() ?? "U"}
          </div>
          <span className="flex-1 truncate text-xs text-sidebar-foreground/70">{user?.email}</span>
        </motion.div>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span className="text-xs">Sair</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
