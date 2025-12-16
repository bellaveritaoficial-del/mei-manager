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
import { Loader2, BarChart3, TrendingUp, TrendingDown } from "lucide-react";

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-xl min-w-[180px]">
      <p className="font-semibold text-foreground mb-3 text-center border-b border-border pb-2">
        {label}
      </p>
      <div className="space-y-2">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {entry.dataKey === 'receitas' ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-400" />
              )}
              <span className="text-sm text-muted-foreground">{entry.name}:</span>
            </div>
            <span className={`font-bold text-sm ${entry.dataKey === 'receitas' ? 'text-emerald-500' : 'text-rose-400'}`}>
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

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
    <Card className="border-border shadow-sm overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Fluxo Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
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
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="receitasGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="despesasGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#be123c" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} vertical={false} />
              <XAxis
                dataKey="mes"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(value) =>
                  new Intl.NumberFormat("pt-BR", {
                    notation: "compact",
                    compactDisplay: "short",
                  }).format(value)
                }
                width={50}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
              <Legend
                iconType="circle"
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
              />
              <Bar
                dataKey="receitas"
                fill="url(#receitasGradient)"
                name="Receitas"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="despesas"
                fill="url(#despesasGradient)"
                name="Despesas"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

