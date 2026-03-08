import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { StarfieldBackground } from "@/components/StarfieldBackground";
import { PageTransition } from "@/components/PageTransition";
import { AnimatePresence } from "framer-motion";

export function AppLayout() {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <StarfieldBackground count={60} />
        <AppSidebar />
        <main className="flex-1 overflow-auto relative z-10">
          <header className="sticky top-0 z-20 flex h-14 items-center border-b border-border/50 bg-background/60 px-4 backdrop-blur-xl">
            <SidebarTrigger />
          </header>
          <div className="p-6">
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
