import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  BarChart3,
  Wallet,
  Settings,
  Menu,
  X,
  Receipt,
  Package,
  LogOut,
  Sun,
  Moon,
  ShieldAlert,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { useMEI } from "@/hooks/useMEI";

const navItems = [
  { to: "/", icon: BarChart3, label: "Dashboard" },
  { to: "/clientes", icon: Users, label: "Clientes" },
  { to: "/notas", icon: FileText, label: "Notas Fiscais" },
  { to: "/cobrancas", icon: Wallet, label: "Cobranças" },
  { to: "/estoque", icon: Package, label: "Estoque" },
  { to: "/relatorios", icon: FileText, label: "Relatórios" },
  { to: "/mei", icon: ShieldAlert, label: "Controle MEI" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { config } = useMEI();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado!");
      navigate("/auth");
    } catch (error) {
      toast.error("Erro ao fazer logout");
    }
  };

  return (
    <>
      {/* Mobile toggle - Only visible when closed */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 z-50 lg:hidden bg-background/50 backdrop-blur-sm border shadow-sm"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      )}

      {/* Overlay - click to close */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40 transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border group cursor-pointer relative">
            {/* Mobile Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 lg:hidden h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-border/50 bg-background transition-all duration-500 ease-out group-hover:shadow-primary/20 group-hover:border-primary/30 group-hover:scale-105">
                {/* SAFE ACCESS TO CONFIG */}
                {(config as any)?.logo_url ? (
                  <img
                    src={(config as any).logo_url}
                    alt="Logo"
                    className="w-full h-full object-contain transition-transform duration-700 ease-in-out group-hover:scale-110 group-hover:rotate-3"
                  />
                ) : (
                  <div className="w-full h-full bg-primary flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                    <Receipt className="w-8 h-8 text-primary-foreground animate-pulse" />
                  </div>
                )}
              </div>
              <div className="min-w-0 transition-opacity duration-300">
                <h1 className="font-bold text-lg text-foreground leading-tight truncate group-hover:text-primary transition-colors duration-300">
                  {(config as any)?.razao_social || (config as any)?.nome_fantasia || "NF Control"}
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  {(config as any)?.cnpj || "Gestão Completa"}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border space-y-3">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-5 h-5" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-5 h-5" />
                  <span>Modo Escuro</span>
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </Button>
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4">
              <p className="text-sm font-medium text-foreground">
                Dados Reais ✓
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Conectado ao Supabase
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
