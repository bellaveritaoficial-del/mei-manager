import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { FinancialChart } from "@/components/dashboard/FinancialChart";
import { useFinancial } from "@/hooks/useFinancial";
import { useInvoices } from "@/hooks/useInvoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Clock,
  PieChart,
  Plus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const Financial = () => {
  const { transactions, summary, aging, createTransaction, isLoading } = useFinancial();
  const { invoices, financialSummary } = useInvoices();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'receita' as 'receita' | 'despesa',
    descricao: '',
    valor: 0,
    categoria: '',
    data_vencimento: '',
    forma_pagamento: '',
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTransaction.mutateAsync(formData);
      toast.success('Transação cadastrada!');
      setIsDialogOpen(false);
      setFormData({
        tipo: 'receita',
        descricao: '',
        valor: 0,
        categoria: '',
        data_vencimento: '',
        forma_pagamento: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cadastrar');
    }
  };

  // Combine invoice and transaction data
  const combinedSummary = {
    totalReceitas: financialSummary.totalReceitas + summary.totalReceitas,
    totalDespesas: financialSummary.totalDespesas + summary.totalDespesas,
    saldo: (financialSummary.totalReceitas + summary.totalReceitas) - (financialSummary.totalDespesas + summary.totalDespesas),
    notasPagas: financialSummary.notasPagas,
    notasPendentes: financialSummary.notasPendentes,
    notasVencidas: financialSummary.notasVencidas,
  };

  const pieData = [
    { name: "Pagas", value: combinedSummary.notasPagas || 0, color: "hsl(var(--primary))" },
    { name: "Pendentes", value: combinedSummary.notasPendentes || 0, color: "hsl(var(--chart-4))" },
    { name: "Vencidas", value: combinedSummary.notasVencidas || 0, color: "hsl(var(--destructive))" },
  ];

  const totalNotas = combinedSummary.notasPagas + combinedSummary.notasPendentes + combinedSummary.notasVencidas;
  const percentualPagas = totalNotas > 0 ? (combinedSummary.notasPagas / totalNotas) * 100 : 0;

  // Pending invoices
  const pendingInvoices = invoices.filter((inv) => inv.status !== "pago");

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8 pt-12 md:pt-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Área Financeira</h1>
            <p className="text-muted-foreground mt-1">
              Controle financeiro e análise de notas fiscais
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Transação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: 'receita' | 'despesa') => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receita">Receita</SelectItem>
                      <SelectItem value="despesa">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento</Label>
                    <Input
                      type="date"
                      value={formData.data_vencimento}
                      onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createTransaction.isPending}>
                  {createTransaction.isPending ? 'Salvando...' : 'Cadastrar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Saldo Total"
            value={formatCurrency(combinedSummary.saldo)}
            icon={<Wallet className="w-6 h-6" />}
            variant={combinedSummary.saldo >= 0 ? "success" : "danger"}
            trend={{ value: 12.5, isPositive: combinedSummary.saldo >= 0 }}
          />
          <StatCard
            title="Total Receitas"
            value={formatCurrency(combinedSummary.totalReceitas)}
            icon={<TrendingUp className="w-6 h-6" />}
            variant="default"
          />
          <StatCard
            title="Total Despesas"
            value={formatCurrency(combinedSummary.totalDespesas)}
            icon={<TrendingDown className="w-6 h-6" />}
            variant="danger"
          />
          <StatCard
            title="Notas Vencidas"
            value={combinedSummary.notasVencidas.toString()}
            icon={<AlertTriangle className="w-6 h-6" />}
            variant="danger"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FinancialChart />

          {/* Pie Chart Card */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                Status das Notas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totalNotas === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma nota cadastrada</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPie>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contas a Receber */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Contas a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                <p>Todas as notas estão pagas!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-background border border-border"
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        invoice.status === "vencido"
                          ? "bg-destructive/10"
                          : "bg-chart-4/10"
                      )}
                    >
                      {invoice.status === "vencido" ? (
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      ) : (
                        <Clock className="w-5 h-5 text-chart-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        NF-e {invoice.numero}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.dest_razao_social || 'Destinatário não informado'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(invoice.valor_total_nota)}
                      </p>
                      <Badge
                        className={cn(
                          invoice.status === "vencido"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-chart-4/20 text-chart-4"
                        )}
                      >
                        {invoice.status === "vencido" ? "Vencido" : "Pendente"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Taxa de Recebimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Notas pagas este mês
                </span>
                <span className="font-semibold text-foreground">
                  {combinedSummary.notasPagas} de {totalNotas}
                </span>
              </div>
              <Progress value={percentualPagas} className="h-3" />
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {percentualPagas.toFixed(0)}% das notas foram pagas
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Financial;
