import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationServer } from "@/components/NotificationServer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import Index from "./pages/Index";
import InvoiceList from "./pages/InvoiceList";
import InvoiceDetail from "./pages/InvoiceDetail";

import Financial from "./pages/Financial";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Inventory from "./pages/Inventory";

import MEIDashboard from "./pages/MEIDashboard";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import Customers from "./pages/Customers";
import CustomerProfile from "./pages/CustomerProfile";
import Charges from "./pages/Charges";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Toaster />
        <Sonner />
        <NotificationServer />
        <BrandingUpdater />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index />} />
            <Route path="/notas" element={<InvoiceList />} />
            <Route path="/notas/:id" element={<InvoiceDetail />} />

            <Route path="/estoque" element={<Inventory />} />
            <Route path="/financeiro" element={<Financial />} />

            <Route path="/relatorios" element={<Reports />} />
            <Route path="/mei" element={<MEIDashboard />} />
            <Route path="/configuracoes" element={<Settings />} />

            <Route path="/clientes" element={<Customers />} />
            <Route path="/clientes/:id" element={<CustomerProfile />} />
            <Route path="/cobrancas" element={<Charges />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

// Helper component to handle side effects inside providers
import { useMEI } from "@/hooks/useMEI";
import { useEffect } from "react";

function BrandingUpdater() {
  const { config } = useMEI();

  useEffect(() => {
    const safeConfig = config as any;
    if (safeConfig?.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = safeConfig.favicon_url;
    }

    if (safeConfig?.razao_social) {
      document.title = safeConfig.razao_social;
    }
  }, [config]);

  return null;
}

export default App;
