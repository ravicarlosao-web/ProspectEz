import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { PageTransition } from "@/components/PageTransition";
import { AnimatePresence } from "framer-motion";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RecoverPassword from "./pages/RecoverPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Messages from "./pages/Messages";
import Prospection from "./pages/Prospection";
import SettingsPage from "./pages/SettingsPage";
import Finance from "./pages/Finance";
import Admin from "./pages/Admin";
import { AdminOverview } from "./components/admin/AdminOverview";
import { AdminUsers } from "./components/admin/AdminUsers";
import { AdminPlans } from "./components/admin/AdminPlans";
import { AdminLogs } from "./components/admin/AdminLogs";
import { AdminAudit } from "./components/admin/AdminAudit";
import { AdminTemplates } from "./components/admin/AdminTemplates";
import { AdminFinance } from "./components/admin/AdminFinance";
import { AdminFirecrawl } from "./components/admin/AdminFirecrawl";
import { AdminSecurityLogs } from "./components/admin/AdminSecurityLogs";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/registar" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/recuperar-senha" element={<PageTransition><RecoverPassword /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/mensagens" element={<Messages />} />
          <Route path="/prospeccao" element={<Prospection />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="/financeiro" element={<Finance />} />
          <Route path="/admin" element={<Admin />}>
            <Route index element={<AdminOverview />} />
            <Route path="utilizadores" element={<AdminUsers />} />
            <Route path="planos" element={<AdminPlans />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="auditoria" element={<AdminAudit />} />
            <Route path="templates" element={<AdminTemplates />} />
            <Route path="financeiro" element={<AdminFinance />} />
            <Route path="firecrawl" element={<AdminFirecrawl />} />
            <Route path="seguranca" element={<AdminSecurityLogs />} />
          </Route>
        </Route>
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AnimatedRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
