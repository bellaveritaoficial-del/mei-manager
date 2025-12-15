import { Invoice } from "@/types/invoice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

interface RecentInvoicesProps {
  invoices: Invoice[];
  onSelect?: (invoice: Invoice) => void;
}

const statusStyles = {
  pendente: "bg-chart-4/20 text-chart-4 hover:bg-chart-4/30",
  pago: "bg-primary/20 text-primary hover:bg-primary/30",
  vencido: "bg-destructive/20 text-destructive hover:bg-destructive/30",
  cancelado: "bg-muted text-muted-foreground hover:bg-muted/80",
};

const statusLabels = {
  pendente: "Pendente",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

export function RecentInvoices({ invoices, onSelect }: RecentInvoicesProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Notas Fiscais Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center gap-4 p-4 rounded-lg bg-background hover:bg-accent/50 cursor-pointer transition-colors border border-border"
              onClick={() => onSelect?.(invoice)}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  NF-e {invoice.numero}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {invoice.destinatario.razaoSocial}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  {formatCurrency(invoice.totais.valorTotalNota)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(invoice.dataEmissao)}
                </p>
              </div>
              <Badge className={cn("ml-2", statusStyles[invoice.status])}>
                {statusLabels[invoice.status]}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
