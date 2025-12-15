import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useInvoices } from "@/hooks/useInvoices";
import { useFinancial } from "@/hooks/useFinancial";
import { useMemo } from "react";
import { Loader2, BarChart3 } from "lucide-react";

export function FinancialChart() {
  const { invoices, isLoading: loadingInvoices } = useInvoices();
  const { transactions, isLoading: loadingTransactions } = useFinancial();

  // Aggregate data by month from real data
  const data = useMemo(() => {
    const monthlyData: Record<string, { receitas: number; despesas: number }> = {};
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Process invoices (receitas from tipo_operacao = 1)
    invoices.forEach((inv) => {
      if (!inv.data_emissao) return;
      const date = new Date(inv.data_emissao);
      const monthKey = months[date.getMonth()];

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { receitas: 0, despesas: 0 };
      }

      if (inv.tipo_operacao === 1) {
        monthlyData[monthKey].receitas += inv.valor_total_nota || 0;
      } else {
        monthlyData[monthKey].despesas += inv.valor_total_nota || 0;
      }
    });

    // Process transactions
    transactions.forEach((trans) => {
      const dateField = trans.data_vencimento || trans.created_at;
      if (!dateField) return;
      const date = new Date(dateField);
      const monthKey = months[date.getMonth()];

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { receitas: 0, despesas: 0 };
      }

      if (trans.tipo === 'receita') {
        monthlyData[monthKey].receitas += trans.valor || 0;
      } else {
        monthlyData[monthKey].despesas += trans.valor || 0;
      }
    });

    // Convert to array and sort by month order
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthKey = months[monthIndex];
      last6Months.push({
        mes: monthKey,
        receitas: monthlyData[monthKey]?.receitas || 0,
        despesas: monthlyData[monthKey]?.despesas || 0,
      });
    }

    return last6Months;
  }, [invoices, transactions]);

  const isLoading = loadingInvoices || loadingTransactions;
  const hasData = data.some(d => d.receitas > 0 || d.despesas > 0);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Fluxo Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
            <p>Nenhum dado financeiro</p>
            <p className="text-sm">Cadastre notas ou transações para ver o gráfico</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="mes"
                className="text-muted-foreground"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                className="text-muted-foreground"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) =>
                  new Intl.NumberFormat("pt-BR", {
                    notation: "compact",
                    compactDisplay: "short",
                  }).format(value)
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) =>
                  new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(value)
                }
              />
              <Legend />
              <Bar
                dataKey="receitas"
                fill="hsl(var(--primary))"
                name="Receitas"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="despesas"
                fill="hsl(var(--chart-5))"
                name="Despesas"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
