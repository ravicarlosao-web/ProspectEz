import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();

  const icon =
    theme === "light" ? (
      <Sun className="h-4 w-4" />
    ) : theme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Monitor className="h-4 w-4" />
    );

  const label =
    theme === "light" ? "Claro" : theme === "dark" ? "Escuro" : "Sistema";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center"
            >
              {icon}
            </motion.span>
          </AnimatePresence>
          {!collapsed && <span className="text-xs">{label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2 text-xs">
          <Sun className="h-3.5 w-3.5" /> Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2 text-xs">
          <Moon className="h-3.5 w-3.5" /> Escuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2 text-xs">
          <Monitor className="h-3.5 w-3.5" /> Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
