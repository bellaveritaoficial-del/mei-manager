import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useInventory } from '@/hooks/useInventory';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Package, Plus, AlertTriangle, TrendingUp, Search, Loader2, Brain, BarChart3, RefreshCw, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { useMEI } from '@/hooks/useMEI';
import { ProductModal } from '@/components/inventory/ProductModal';
import { AIAnalysisDisplay } from '@/components/inventory/AIAnalysisDisplay';

const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

const Inventory = () => {
    const { products, isLoading, createProduct, summary, lowStockProducts } = useInventory();
    const { company } = useCompany();
    const { config } = useMEI();
    const [search, setSearch] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

    // Prepare chart data
    const categoryData = products.reduce((acc, product) => {
        const cat = product.categoria || 'Sem Categoria';
        const existing = acc.find(item => item.name === cat);
        if (existing) {
            existing.value += product.quantidade_atual || 0;
            existing.count += 1;
        } else {
            acc.push({ name: cat, value: product.quantidade_atual || 0, count: 1 });
        }
        return acc;
    }, [] as { name: string; value: number; count: number }[]);

    const topProducts = [...products]
        .sort((a, b) => (b.preco_venda || 0) * (b.quantidade_atual || 0) - (a.preco_venda || 0) * (a.quantidade_atual || 0))
        .slice(0, 5)
        .map(p => ({
            name: p.descricao.substring(0, 15) + (p.descricao.length > 15 ? '...' : ''),
            valor: (p.preco_venda || 0) * (p.quantidade_atual || 0),
        }));

    // AI Analysis function
    const handleAnalyzeInventory = async () => {
        setIsAnalyzing(true);
        try {
            const inventoryData = {
                totalProducts: summary.totalProducts,
                totalValue: summary.totalValue,
                lowStockCount: summary.lowStockCount,
                lowStockProducts: lowStockProducts.map(p => ({
                    descricao: p.descricao,
                    quantidade_atual: p.quantidade_atual,
                    quantidade_minima: p.quantidade_minima,
                })),
                topProducts: topProducts,
                categories: categoryData,
            };

            const { data, error } = await supabase.functions.invoke('inventory-agent', {
                body: { inventoryData },
            });

            if (error) throw error;

            const analysisText = data.analysis || 'Análise não disponível';
            setAiAnalysis(analysisText);

            // Save to history with title, category and company_id
            if (company?.id) {
                const titulo = `Análise de Estoque - ${new Date().toLocaleDateString('pt-BR')}`;
                const { error: saveError } = await supabase
                    .from('ai_analysis_history')
                    // @ts-ignore - new columns not in generated types yet
                    .insert({
                        company_id: company.id,
                        titulo,
                        categoria: 'estoque',
                        tipo: 'estoque',
                        prompt: 'Análise inteligente de estoque',
                        resposta: {
                            analysis: analysisText,
                            model: data.model,
                            summary: {
                                totalProducts: summary.totalProducts,
                                totalValue: summary.totalValue,
                                lowStockCount: summary.lowStockCount
                            }
                        },
                        insights: analysisText
                    });

                if (saveError) {
                    console.error('Error saving analysis:', saveError);
                } else {
                    toast.success('Análise salva no histórico!');
                }
            }
        } catch (error: any) {
            console.error('Error analyzing inventory:', error);
            toast.error('Erro ao analisar estoque. Verifique se o agente está configurado.');
            setAiAnalysis('❌ Agente de estoque não configurado. Configure a Edge Function `inventory-agent` para habilitar análises inteligentes.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };



    const filteredProducts = products.filter(p =>
        p.descricao.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo.toLowerCase().includes(search.toLowerCase())
    );

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
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-12 lg:pt-0">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Controle de Estoque</h1>
                        <p className="text-muted-foreground mt-1">Gerencie seus produtos e movimentações</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) setProductToEdit(null);
                    }}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 w-full sm:w-auto">
                                <Plus className="w-4 h-4" />
                                Novo Produto
                            </Button>
                        </DialogTrigger>
                        <ProductModal
                            onClose={() => { setIsDialogOpen(false); setProductToEdit(null); }}
                            productToEdit={productToEdit}
                        />
                    </Dialog>
                </div>

                {/* AI Analysis Section */}
                <Card className="border-primary/30">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                    <Brain className="w-5 h-5 text-primary shrink-0" />
                                    Análise Inteligente
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm mt-1">
                                    Powered by GPT-o3 (Agente de Estoque)
                                </CardDescription>
                            </div>
                            <Button
                                onClick={handleAnalyzeInventory}
                                disabled={isAnalyzing || products.length === 0}
                                className="gap-2 w-full sm:w-auto"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Analisando...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" />
                                        Analisar Estoque
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {aiAnalysis ? (
                            <AIAnalysisDisplay
                                analysis={aiAnalysis}
                                logoUrl={(config as any)?.logo_url}
                                companyName={(config as any)?.nome_fantasia || (config as any)?.razao_social}
                            />
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p>Clique em "Analisar Estoque" para receber insights da IA</p>
                                <p className="text-sm">Sugestões de reposição, produtos parados, previsão de demanda</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Products Table */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <CardTitle>Produtos</CardTitle>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar produto..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Nenhum produto cadastrado</p>
                                <p className="text-sm">Clique em "Novo Produto" para começar</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[60px]">Foto</TableHead>
                                            <TableHead className="hidden md:table-cell">Código</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead className="text-right">Qtd.</TableHead>
                                            <TableHead className="text-right hidden md:table-cell">Custo</TableHead>
                                            <TableHead className="text-right">Venda</TableHead>
                                            <TableHead className="hidden md:table-cell">Status</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProducts.map((product) => {
                                            const isLowStock = (product.quantidade_atual || 0) <= (product.quantidade_minima || 0);
                                            return (
                                                <TableRow key={product.id}>
                                                    <TableCell>
                                                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                                                            {(product as any).image_url ? (
                                                                <img src={(product as any).image_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Package className="w-5 h-5 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono hidden md:table-cell">{product.codigo}</TableCell>
                                                    <TableCell className="max-w-[120px] sm:max-w-[200px] truncate">{product.descricao}</TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        {product.quantidade_atual} {product.unidade}
                                                    </TableCell>
                                                    <TableCell className="text-right hidden md:table-cell">{formatCurrency(product.preco_custo || 0)}</TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(product.preco_venda || 0)}</TableCell>
                                                    <TableCell className="hidden md:table-cell">
                                                        {isLowStock ? (
                                                            <Badge variant="destructive">Baixo</Badge>
                                                        ) : (
                                                            <Badge variant="secondary">Normal</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => { setProductToEdit(product); setIsDialogOpen(true); }}>
                                                                    <Pencil className="w-4 h-4 mr-2" />
                                                                    Editar
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-destructive">
                                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                                    Excluir
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
};

export default Inventory;
