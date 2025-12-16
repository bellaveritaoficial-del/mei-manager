import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentInvoices } from '@/components/dashboard/RecentInvoices';
import { RecentCharges } from '@/components/dashboard/RecentCharges';
import { FinancialChart } from '@/components/dashboard/FinancialChart';
import { useInvoices } from '@/hooks/useInvoices';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Wallet,
  Loader2,
  Building2,
  Plus,
  Users,
  Receipt,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const Index = () => {
  const navigate = useNavigate();
  const { invoices, charges, isLoading: loadingInvoices, financialSummary } = useInvoices();
  const { company, isLoading: loadingCompany, createCompany, hasCompany } = useCompany();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    municipio: '',
    uf: 'SP',
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      }
      setIsAuthChecking(false);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!loadingCompany && !hasCompany && !isAuthChecking) {
      setShowCompanyDialog(true);
    }
  }, [loadingCompany, hasCompany, isAuthChecking]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCompany.mutateAsync(companyForm);
      setShowCompanyDialog(false);
      toast.success('Empresa cadastrada com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cadastrar empresa');
    }
  };

  // Transform invoices for RecentInvoices component
  const transformedInvoices = invoices.map(inv => ({
    id: inv.id,
    numero: inv.numero,
    serie: inv.serie || '001',
    chaveAcesso: inv.chave_acesso || '',
    naturezaOperacao: inv.natureza_operacao || '',
    dataEmissao: inv.data_emissao,
    dataSaida: inv.data_saida || inv.data_emissao,
    emitente: {
      razaoSocial: company?.razao_social || '',
      nomeFantasia: company?.nome_fantasia || '',
      cnpj: company?.cnpj || '',
      inscricaoEstadual: company?.inscricao_estadual || '',
      endereco: company?.endereco || '',
      municipio: company?.municipio || '',
      uf: company?.uf || '',
      cep: company?.cep || '',
      telefone: company?.telefone || '',
    },
    destinatario: {
      razaoSocial: inv.dest_razao_social || '',
      cnpj: inv.dest_cnpj || '',
      inscricaoEstadual: inv.dest_inscricao_estadual || '',
      endereco: inv.dest_endereco || '',
      municipio: inv.dest_municipio || '',
      uf: inv.dest_uf || '',
      cep: inv.dest_cep || '',
    },
    produtos: inv.invoice_items?.map(item => ({
      codigo: item.codigo || '',
      descricao: item.descricao,
      ncm: item.ncm || '',
      cfop: item.cfop || '',
      unidade: item.unidade || 'UN',
      quantidade: item.quantidade,
      valorUnitario: item.valor_unitario,
      valorTotal: item.valor_total,
      icms: item.aliq_icms || 0,
      ipi: item.aliq_ipi || 0,
    })) || [],
    totais: {
      baseCalculoIcms: inv.base_calculo_icms || 0,
      valorIcms: inv.valor_icms || 0,
      baseCalculoIcmsSt: 0,
      valorIcmsSt: 0,
      valorTotalProdutos: inv.valor_total_produtos || 0,
      valorFrete: inv.valor_frete || 0,
      valorSeguro: inv.valor_seguro || 0,
      desconto: inv.desconto || 0,
      outrasDespesas: 0,
      valorIpi: inv.valor_ipi || 0,
      valorTotalNota: inv.valor_total_nota,
    },
    informacoesAdicionais: inv.informacoes_adicionais || '',
    status: inv.status as 'pendente' | 'pago' | 'vencido' | 'cancelado',
  }));

  if (isAuthChecking || loadingCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MainLayout>
      {/* Company Setup Dialog */}
      <Dialog open={showCompanyDialog} onOpenChange={setShowCompanyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Configure sua Empresa
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCompany} className="space-y-4">
            <div className="space-y-2">
              <Label>Razão Social *</Label>
              <Input
                value={companyForm.razao_social}
                onChange={(e) => setCompanyForm({ ...companyForm, razao_social: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input
                value={companyForm.nome_fantasia}
                onChange={(e) => setCompanyForm({ ...companyForm, nome_fantasia: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ *</Label>
              <Input
                value={companyForm.cnpj}
                onChange={(e) => setCompanyForm({ ...companyForm, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Município *</Label>
                <Input
                  value={companyForm.municipio}
                  onChange={(e) => setCompanyForm({ ...companyForm, municipio: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>UF *</Label>
                <Input
                  value={companyForm.uf}
                  onChange={(e) => setCompanyForm({ ...companyForm, uf: e.target.value })}
                  maxLength={2}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createCompany.isPending}>
              {createCompany.isPending ? 'Salvando...' : 'Cadastrar Empresa'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 pt-12 md:pt-0">
        {/* Header with Quick Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {company ? `${company.nome_fantasia || company.razao_social}` : 'Visão geral das suas finanças'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate('/cobrancas')} className="gap-1">
              <Plus className="w-4 h-4" />
              Nova Cobrança
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/notas')} className="gap-1">
              <Receipt className="w-4 h-4" />
              Nova Nota
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/clientes/new')} className="gap-1">
              <Users className="w-4 h-4" />
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* Stats Grid - Improved Design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Saldo Atual"
            value={formatCurrency(financialSummary.saldo)}
            icon={<Wallet className="w-6 h-6" />}
            variant={financialSummary.saldo >= 0 ? 'success' : 'warning'}
            trend={{ value: 0, isPositive: financialSummary.saldo >= 0 }}
          />
          <StatCard
            title="Receitas (Pagas)"
            value={formatCurrency(financialSummary.totalReceitas)}
            icon={<TrendingUp className="w-6 h-6" />}
            variant="success"
          />
          <StatCard
            title="A Receber (Pendente)"
            value={formatCurrency(financialSummary.pendingReceita || 0)}
            icon={<CheckCircle className="w-6 h-6" />}
            variant="default"
          />
          <StatCard
            title="A Pagar (Pendente)"
            value={formatCurrency(financialSummary.pendingDespesa || 0)}
            icon={<AlertCircle className="w-6 h-6" />}
            variant="warning"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FinancialChart />
          <RecentCharges
            charges={charges as any}
            onSelect={(charge) => navigate('/financeiro')}
          />
        </div>

        {/* Recent Invoices */}
        <div>
          <RecentInvoices
            invoices={transformedInvoices}
            onSelect={(invoice) => navigate(`/notas/${invoice.id}`)}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;

