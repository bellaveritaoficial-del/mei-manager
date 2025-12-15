import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMEI } from '@/hooks/useMEI';
import { useFinancial } from '@/hooks/useFinancial';
import { useInventory } from '@/hooks/useInventory';
import { useInvoices } from '@/hooks/useInvoices';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
    AlertTriangle,
    TrendingUp,
    DollarSign,
    ShieldAlert,
    CheckCircle2,
    Brain,
    Loader2,
    Briefcase
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const MEIDashboard = () => {
    const { config, isLoading: loadingConfig } = useMEI();
    const { summary: financialSummary, transactions } = useFinancial();
    const { summary: inventorySummary } = useInventory();
    const { invoices } = useInvoices();

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);

    const accumulatedRevenue = financialSummary.totalReceitas || 0;
    const limit = (config as any)?.annual_limit || 81000;
    const percentage = (accumulatedRevenue / limit) * 100;

    // Determine alert level
    let alertStatus = {
        level: 'normal',
        color: 'bg-green-500',
        text: 'text-green-500',
        message: 'Faturamento sob controle within MEI.',
        icon: CheckCircle2
    };

    if (percentage > 95) {
        alertStatus = {
            level: 'block',
            color: 'bg-red-600',
            text: 'text-red-600',
            message: 'CRÍTICO: Você está muito próximo de estourar o limite MEI! Risco de desenquadramento imediato.',
            icon: ShieldAlert
        };
    } else if (percentage > 85) {
        alertStatus = {
            level: 'critical',
            color: 'bg-red-500',
            text: 'text-red-500',
            message: 'ALERTA: Faturamento alto. Planeje migração para ME ou reduza faturamento.',
            icon: AlertTriangle
        };
    } else if (percentage > 70) {
        alertStatus = {
            level: 'warning',
            color: 'bg-yellow-500',
            text: 'text-yellow-500',
            message: 'ATENÇÃO: Você consumiu mais de 70% do seu limite anual.',
            icon: AlertTriangle
        };
    }

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const { data, error } = await supabase.functions.invoke('agent-coordinator', {
                body: {
                    action: 'analyze_situation',
                    data: {
                        financialData: {
                            ...financialSummary,
                            totalReceitas: accumulatedRevenue,
                            notasPendentes: financialSummary.pendentes,
                            notasVencidas: financialSummary.vencidos
                        },
                        inventoryData: inventorySummary,
                    }
                }
            });

            if (error) throw error;
            setAiAnalysis(data.decision);
            toast.success('Análise completa realizada pelos agentes!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao realizar análise.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (loadingConfig) {
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
            <div className="space-y-6 pt-12 md:pt-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Controle MEI</h1>
                        <p className="text-muted-foreground mt-1">Monitore seu limite anual e saúde do negócio</p>
                    </div>
                    <Button onClick={handleAnalyze} disabled={isAnalyzing} className="gap-2">
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                        Analisar Negócio
                    </Button>
                </div>

                {/* Main Limit Card */}
                <Card className={`border-2 ${percentage > 85 ? 'border-red-500/50' : percentage > 70 ? 'border-yellow-500/50' : 'border-primary/20'}`}>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Limite de Faturamento Anual</span>
                            <span className={alertStatus.text}>{percentage.toFixed(1)}% utilizado</span>
                        </CardTitle>
                        <CardDescription>
                            Limite atual: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(limit)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Progress value={percentage} className={`h-4 ${percentage > 85 ? '[&>div]:bg-red-500' : percentage > 70 ? '[&>div]:bg-yellow-500' : ''}`} />
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Utilizado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(accumulatedRevenue)}</span>
                                <span>Restante: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.max(0, limit - accumulatedRevenue))}</span>
                            </div>
                        </div>

                        <Alert className={`${percentage > 70 ? (percentage > 85 ? 'bg-red-500/10 border-red-500/50' : 'bg-yellow-500/10 border-yellow-500/50') : 'bg-green-500/10 border-green-500/50'}`}>
                            <alertStatus.icon className={`h-4 w-4 ${alertStatus.text}`} />
                            <AlertTitle className={alertStatus.text}>{percentage > 95 ? 'BLOQUEIO IMINENTE' : percentage > 85 ? 'CRÍTICO' : percentage > 70 ? 'ATENÇÃO' : 'SITUAÇÃO NORMAL'}</AlertTitle>
                            <AlertDescription className="text-foreground/80">
                                {alertStatus.message}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Receita Mensal Média</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(accumulatedRevenue / (new Date().getMonth() + 1))}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                Baseado em {new Date().getMonth() + 1} meses de operação
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Projeção Anual</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-500">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((accumulatedRevenue / (new Date().getMonth() + 1)) * 12)}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                Se mantiver a média atual
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Imposto DAS (Estimado)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-muted-foreground">
                                R$ 75,00
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                Valor fixo mensal (aprox.)
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* AI Analysis Result */}
                {aiAnalysis && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="col-span-1 md:col-span-2 border-primary/50 bg-primary/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Brain className="w-5 h-5 text-primary" />
                                    Análise do Orquestrador
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Resumo</h3>
                                    <p className="text-sm text-muted-foreground">{aiAnalysis.summary}</p>
                                </div>
                                {aiAnalysis.alerts?.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold mb-2">Alertas Prioritários</h3>
                                        <div className="space-y-2">
                                            {aiAnalysis.alerts.map((alert: any, i: number) => (
                                                <div key={i} className={`p-3 rounded-md text-sm border ${alert.level === 'critical' ? 'bg-red-500/20 border-red-500/50 text-red-200' :
                                                    alert.level === 'high' ? 'bg-orange-500/20 border-orange-500/50 text-orange-200' :
                                                        'bg-blue-500/20 border-blue-500/50 text-blue-200'
                                                    }`}>
                                                    <span className="font-bold uppercase text-xs mr-2">[{alert.level}]</span>
                                                    {alert.message}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {aiAnalysis.recommendations?.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold mb-2">Recomendações</h3>
                                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                            {aiAnalysis.recommendations.map((rec: string, i: number) => (
                                                <li key={i}>{rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default MEIDashboard;
