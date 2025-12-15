import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useFinancial } from '@/hooks/useFinancial';
import { useInventory } from '@/hooks/useInventory';
import { useCompany } from '@/hooks/useCompany';
import { useMEI } from '@/hooks/useMEI';
import { toast } from 'sonner';
import {
    FileText, Loader2, Calendar, RefreshCw, ChevronRight,
    AlertTriangle, CheckCircle2, Info, Download, MoreVertical, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Report {
    id: string;
    created_at: string;
    tipo: string;
    titulo?: string;
    categoria?: string;
    insights: any;
    prompt: string;
    resposta?: any;
}

// Helper component to render different report types
const ReportRenderer = ({ data }: { data: any }) => {
    if (!data) return <p className="text-muted-foreground">Sem dados para exibir.</p>;

    // Case 1: Array of items (Bottlenecks/Issues)
    if (Array.isArray(data)) {
        return (
            <div className="space-y-4">
                {data.map((item: any, index: number) => (
                    <Card key={index} className="border-l-4 border-l-primary/50 overflow-hidden relative transition-all hover:shadow-md">
                        {/* Severity Indicator */}
                        <div className={`absolute top-0 right-0 p-2 opacity-80 ${(item.severidade === 'critica' || item.level === 'critical') ? 'bg-red-500/10 text-red-500' :
                            (item.severidade === 'alta' || item.level === 'high') ? 'bg-orange-500/10 text-orange-500' :
                                (item.severidade === 'media' || item.level === 'medium') ? 'bg-yellow-500/10 text-yellow-500' :
                                    'bg-blue-500/10 text-blue-500'
                            }`}>
                            <span className="text-xs font-bold uppercase px-2 rounded-full border border-current">
                                {item.severidade || item.level || 'info'}
                            </span>
                        </div>

                        <CardContent className="pt-6">
                            <div className="mb-3 pr-20">
                                {item.categoria && (
                                    <Badge variant="secondary" className="mb-2 text-[10px] tracking-wider font-semibold opacity-70">
                                        {item.categoria.replace(/_/g, ' ').toUpperCase()}
                                    </Badge>
                                )}
                                <h3 className="text-lg font-bold flex items-center gap-2 leading-tight">
                                    {item.titulo || item.message || "Item de Análise"}
                                </h3>
                            </div>

                            <p className="text-muted-foreground mb-4 text-sm leading-relaxed border-l-2 pl-4 border-muted">
                                {item.descricao || item.details}
                            </p>

                            {item.recomendacao && (
                                <Alert className="bg-primary/5 border-primary/20 text-primary-foreground">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    <AlertTitle className="text-primary text-xs font-extrabold uppercase pb-1 tracking-wide">Recomendação da IA</AlertTitle>
                                    <AlertDescription className="text-primary/90 text-sm font-medium">
                                        {item.recomendacao}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    // Case 2: Object
    if (typeof data === 'object' && !Array.isArray(data)) {
        if (!data.summary && !data.alerts && !data.recommendations) {
            return (
                <div className="space-y-2 font-mono text-xs p-4 bg-muted/30 rounded-lg border">
                    {Object.entries(data).map(([key, value]) => (
                        <div key={key} className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                            <span className="font-bold text-muted-foreground min-w-[100px]">{key}:</span>
                            <span className="whitespace-pre-wrap break-all">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {data.summary && (
                    <div className="bg-gradient-to-br from-card to-muted/20 border rounded-xl p-6 shadow-sm">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-primary">
                            <FileText className="w-5 h-5" /> Resumo Executivo
                        </h3>
                        <p className="text-foreground/90 leading-relaxed text-base">
                            {data.summary}
                        </p>
                    </div>
                )}

                {data.alerts && data.alerts.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <span className="relative flex h-3 w-3 mr-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                            </span>
                            Pontos de Atenção
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-1">
                            {data.alerts.map((alert: any, i: number) => (
                                <Alert key={i} variant={alert.level === 'critical' ? 'destructive' : 'default'}
                                    className={`${alert.level === 'critical' ? 'border-red-500 bg-red-500/5' :
                                        alert.level === 'high' ? 'border-orange-500 text-orange-700 bg-orange-500/5 dark:text-orange-400' :
                                            'border-blue-500 text-blue-700 bg-blue-500/5 dark:text-blue-400'
                                        }`}>
                                    {alert.level === 'critical' || alert.level === 'high' ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                                    <div className="flex-1">
                                        <AlertTitle className="capitalize font-bold flex justify-between items-center text-xs mb-1">
                                            {alert.level.toUpperCase()}
                                        </AlertTitle>
                                        <AlertDescription className="text-sm font-medium">
                                            {alert.message}
                                        </AlertDescription>
                                    </div>
                                </Alert>
                            ))}
                        </div>
                    </div>
                )}

                {data.recommendations && data.recommendations.length > 0 && (
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            Recomendações Práticas
                        </h3>
                        <ul className="space-y-3">
                            {data.recommendations.map((rec: string, i: number) => (
                                <li key={i} className="flex gap-4 items-start p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                                    <div className="min-w-6 flex justify-center mt-0.5">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                                            {i + 1}
                                        </span>
                                    </div>
                                    <span className="text-sm text-foreground/90 leading-relaxed">{rec}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    // Case 3: Markdown String
    if (typeof data === 'string') {
        const sections = data.split(/(?=## )/g);
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {sections.map((section, idx) => {
                    const lines = section.trim().split('\n');
                    let title = lines[0].replace(/^#+\s*/, '').trim();
                    let content = lines.slice(1).join('\n').trim();

                    if (!title && !content) return null;
                    if (!title) {
                        return (
                            <Card key={idx} className="border-none shadow-none bg-transparent">
                                <CardContent className="p-0 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                    {content}
                                </CardContent>
                            </Card>
                        );
                    }

                    const iconMatch = title.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF])/);
                    const icon = iconMatch ? iconMatch[0] : null;
                    const cleanTitle = icon ? title.replace(icon, '').trim() : title;

                    return (
                        <Card key={idx} className="overflow-hidden border-l-4 border-l-primary/30 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="bg-muted/30 pb-3 border-b border-border/50">
                                <CardTitle className="text-lg text-primary font-bold flex items-center gap-2">
                                    {icon && <span className="text-2xl">{icon}</span>}
                                    {cleanTitle}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {content.split('\n').map((line, i) => {
                                    if (line.trim().startsWith('- ')) {
                                        return (
                                            <div key={i} className="flex gap-2 mb-2 items-start">
                                                <span className="text-primary mt-1.5 h-1.5 w-1.5 rounded-full bg-current shrink-0"></span>
                                                <span>{line.replace('- ', '').replace(/\*\*(.*?)\*\*/g, (_, p1) => p1)}</span>
                                            </div>
                                        );
                                    }
                                    if (line.trim().match(/^\d+\. /)) {
                                        return (
                                            <div key={i} className="flex gap-2 mb-2 items-start pl-1">
                                                <span className="font-bold text-primary">{line.split('.')[0]}.</span>
                                                <span>{line.replace(/^\d+\. /, '').replace(/\*\*(.*?)\*\*/g, (_, p1) => p1)}</span>
                                            </div>
                                        );
                                    }
                                    if (line.startsWith('###')) {
                                        return <h4 key={i} className="font-bold text-foreground mt-4 mb-2">{line.replace(/^#+\s*/, '')}</h4>
                                    }
                                    if (line.includes('**')) {
                                        const parts = line.split(/(\*\*.*?\*\*)/g);
                                        return (
                                            <p key={i} className="mb-2">
                                                {parts.map((part, j) => {
                                                    if (part.startsWith('**') && part.endsWith('**')) {
                                                        return <strong key={j} className="text-foreground">{part.slice(2, -2)}</strong>;
                                                    }
                                                    return part;
                                                })}
                                            </p>
                                        )
                                    }
                                    return <p key={i} className="mb-2">{line}</p>;
                                })}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        );
    }

    return <pre className="text-xs p-4 bg-black/80 text-green-400 rounded-md overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
};

const Reports = () => {
    const queryClient = useQueryClient();
    const { summary: financialSummary } = useFinancial();
    const { summary: inventorySummary } = useInventory();
    const { company } = useCompany();
    const { config } = useMEI();
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [reportToDelete, setReportToDelete] = useState<string | null>(null);

    // Mobile view state
    const [isMobileListVisible, setIsMobileListVisible] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const { data: reports, isLoading } = useQuery({
        queryKey: ['ai_analysis_history'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ai_analysis_history')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Report[];
        }
    });

    const generateReport = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke('analysis-agent', {
                body: {
                    financialData: financialSummary,
                    inventoryData: inventorySummary,
                }
            });

            if (error) {
                console.error('Edge Function Error:', error);
                throw error;
            }

            const analysisResult = data;

            if (!company?.id) {
                throw new Error('Empresa não encontrada. Configure sua empresa primeiro.');
            }

            const { data: savedReport, error: saveError } = await supabase
                .from('ai_analysis_history')
                // @ts-ignore
                .insert({
                    company_id: company.id,
                    titulo: `Análise Completa - ${new Date().toLocaleDateString('pt-BR')}`,
                    categoria: 'completo',
                    tipo: 'completo',
                    insights: analysisResult,
                    prompt: 'Consultar agente de análise completo',
                    resposta: analysisResult
                })
                .select()
                .single();

            if (saveError) throw saveError;
            return savedReport;
        },
        onSuccess: (newReport) => {
            queryClient.invalidateQueries({ queryKey: ['ai_analysis_history'] });
            toast.success('Relatório gerado com sucesso!');
            setSelectedReport(newReport as Report);
            setIsMobileListVisible(false); // Go to detail on mobile
        },
        onError: (error) => {
            toast.error('Erro ao gerar relatório: ' + error.message);
        }
    });

    const deleteReport = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('ai_analysis_history')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai_analysis_history'] });
            toast.success('Relatório excluído com sucesso.');
            if (selectedReport?.id === reportToDelete) {
                setSelectedReport(null);
                setIsMobileListVisible(true);
            }
            setReportToDelete(null);
        },
        onError: (error) => {
            toast.error('Erro ao excluir relatório: ' + error.message);
            setReportToDelete(null);
        }
    });

    const handleGenerateClick = () => {
        toast.info('Iniciando análise completa. Isso pode levar alguns segundos...');
        generateReport.mutate();
    };

    const handleReportSelect = (report: Report) => {
        setSelectedReport(report);
        setIsMobileListVisible(false);
    };

    const handleBackToList = () => {
        setIsMobileListVisible(true);
        setSelectedReport(null);
    };

    // Helper to clean text for PDF (remove emojis and markdown)
    const cleanTextForPDF = (text: string): string => {
        if (!text) return '';
        return text
            // First remove markdown
            .replace(/##\s*/g, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/`/g, '')
            // whitelist allowed characters: alphanumeric, spaces, portuguese accents, basic punctuation
            // This strips any weird unicode symbols, invisible chars, or emojis that jsPDF doesn't like
            .replace(/[^a-zA-Z0-9\s.,;:!?()\[\]{}\-–_+=\/@#%&áàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ'"$€R$]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    // Helper to load image as base64 for jsPDF
    const loadImageAsBase64 = (url: string): Promise<string | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    } else {
                        resolve(null);
                    }
                } catch {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    };

    // Helper to generate text based PDF
    const handleExportPDF = async () => {
        if (!selectedReport) return;

        const doc = new jsPDF();
        const data = selectedReport.insights;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);
        let yPos = margin;
        const headerHeight = 45;

        // =========== HEADER WITH LOGO ===========
        doc.setFillColor(103, 58, 183);
        doc.rect(0, 0, pageWidth, headerHeight, 'F');

        // Try to add logo
        const logoUrl = (config as any)?.logo_url;
        let logoAdded = false;
        let textStartX = margin;

        if (logoUrl) {
            try {
                const logoBase64 = await loadImageAsBase64(logoUrl);
                if (logoBase64) {
                    // Add logo with white background circle
                    doc.setFillColor(255, 255, 255);
                    doc.circle(margin + 15, headerHeight / 2, 14, 'F');
                    doc.addImage(logoBase64, 'PNG', margin + 3, (headerHeight / 2) - 12, 24, 24);
                    logoAdded = true;
                    textStartX = margin + 35;
                }
            } catch (e) {
                console.log('Could not load logo for PDF');
            }
        }

        // Company name / title
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        const companyName = cleanTextForPDF((config as any)?.nome_fantasia || (config as any)?.razao_social || 'NF Control');
        doc.text(companyName, textStartX, 15);

        // Report title
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        const reportTitle = cleanTextForPDF((selectedReport as any).titulo || 'Relatorio de Analise');
        doc.text(reportTitle, textStartX, 25);

        // Date and type
        doc.setFontSize(9);
        doc.text(`Gerado em: ${format(new Date(selectedReport.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}  |  Tipo: ${selectedReport.tipo?.toUpperCase() || 'ANALISE'}`, textStartX, 35);

        yPos = 55;

        const checkPageBreak = (heightNeeded: number) => {
            if (yPos + heightNeeded > pageHeight - margin) {
                doc.addPage();
                yPos = margin;
            }
        };

        const printSectionTitle = (title: string) => {
            checkPageBreak(20);
            const cleanTitle = cleanTextForPDF(title).toUpperCase();

            // Background for title
            doc.setFillColor(242, 242, 247);
            doc.setDrawColor(220, 220, 230);
            doc.roundedRect(margin - 5, yPos - 6, maxWidth + 10, 12, 2, 2, 'FD');

            doc.setFontSize(12);
            doc.setTextColor(103, 58, 183);
            doc.setFont("helvetica", "bold");
            doc.text(cleanTitle, margin, yPos);
            yPos += 14;
        };

        const printLine = (text: string, fontSize = 10, fontStyle = 'normal', indent = 0, color = [60, 60, 60]) => {
            const cleanText = cleanTextForPDF(text);
            if (!cleanText) return;

            doc.setFontSize(fontSize);
            // @ts-ignore
            doc.setFont('helvetica', fontStyle);
            doc.setTextColor(color[0], color[1], color[2]);

            const lines = doc.splitTextToSize(cleanText, maxWidth - indent);
            checkPageBreak(lines.length * 5);
            doc.text(lines, margin + indent, yPos);
            yPos += (lines.length * 5) + 2;
        };

        // =========== CONTENT ===========
        if (typeof data === 'string') {
            // Parse markdown sections
            const sections = data.split(/(?=##\s)/).filter(Boolean);

            if (sections.length > 1) {
                sections.forEach(section => {
                    const lines = section.trim().split('\n');
                    const title = lines[0].replace(/^##\s*/, '').trim();
                    const content = lines.slice(1).join('\n').trim();

                    if (title) {
                        printSectionTitle(title);
                    }

                    content.split('\n').forEach(line => {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) {
                            yPos += 3;
                            return;
                        }
                        if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
                            printLine('•  ' + trimmedLine.replace(/^[-•]\s*/, ''), 10, 'normal', 5);
                        } else {
                            printLine(trimmedLine);
                        }
                    });

                    yPos += 6;
                });
            } else {
                // Plain text
                printLine(data);
            }
        } else if (Array.isArray(data)) {
            data.forEach((item: any, i) => {
                checkPageBreak(30);
                printSectionTitle(`${i + 1}. ${item.titulo || item.message || 'Item'}`);
                if (item.descricao || item.details) {
                    printLine(item.descricao || item.details);
                }
                if (item.recomendacao) {
                    yPos += 2;
                    printLine('Recomendacao: ' + item.recomendacao, 10, 'bold', 0, [50, 50, 50]);
                }
                yPos += 8;
            });
        } else if (typeof data === 'object' && data !== null) {
            if (data.summary) {
                printSectionTitle('Resumo Executivo');
                printLine(data.summary);
                yPos += 8;
            }
            if (data.alerts?.length > 0) {
                printSectionTitle('Pontos de Atencao');
                data.alerts.forEach((alert: any) => {
                    const level = alert.level?.toUpperCase() || 'INFO';
                    const isCrit = level === 'CRITICAL' || level === 'HIGH';
                    printLine(`[${level}] ${alert.message}`, 10, isCrit ? 'bold' : 'normal', 0, isCrit ? [220, 40, 40] : [60, 60, 60]);
                });
                yPos += 8;
            }
            if (data.recommendations?.length > 0) {
                printSectionTitle('Recomendacoes');
                data.recommendations.forEach((rec: string, i: number) => {
                    printLine(`${i + 1}. ${rec}`);
                });
            }
            // Fallback for other object types
            if (!data.summary && !data.alerts && !data.recommendations) {
                Object.entries(data).forEach(([key, value]) => {
                    if (typeof value !== 'object') {
                        printLine(`${key}: ${String(value)}`);
                    }
                });
            }
        }

        // =========== FOOTER ===========
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Pagina ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            doc.text('NF Control - Sistema de Gestao MEI', margin, pageHeight - 10);
        }

        doc.save(`relatorio-mei-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    return (
        <MainLayout>
            <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row gap-6 p-2 md:p-0 pt-12 md:pt-0">
                {/* Sidebar List - Hidden on mobile if report selected */}
                <div className={`
                    ${isMobileListVisible ? 'flex' : 'hidden'} 
                    md:flex flex-col w-full md:w-80 lg:w-96 shrink-0 gap-4 h-full
                `}>
                    <div className="flex flex-col gap-2 px-1">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Relatórios</h1>
                        <p className="text-sm text-muted-foreground">Histórico de análises da IA</p>
                    </div>

                    <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-none bg-transparent md:border md:shadow-sm md:bg-card">
                        <div className="p-4 border-b bg-card/50 space-y-3">
                            <Button onClick={handleGenerateClick} disabled={generateReport.isPending} className="w-full gap-2 shadow-sm font-semibold h-10">
                                {generateReport.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                Nova Análise
                            </Button>
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    size="sm"
                                    variant={categoryFilter === 'all' ? 'default' : 'outline'}
                                    onClick={() => setCategoryFilter('all')}
                                    className="text-xs h-7"
                                >
                                    Todos
                                </Button>
                                <Button
                                    size="sm"
                                    variant={categoryFilter === 'estoque' ? 'default' : 'outline'}
                                    onClick={() => setCategoryFilter('estoque')}
                                    className="text-xs h-7"
                                >
                                    📦 Estoque
                                </Button>
                                <Button
                                    size="sm"
                                    variant={categoryFilter === 'completo' ? 'default' : 'outline'}
                                    onClick={() => setCategoryFilter('completo')}
                                    className="text-xs h-7"
                                >
                                    📊 Completo
                                </Button>
                            </div>
                        </div>
                        <ScrollArea className="flex-1 bg-card/30 md:bg-card">
                            {isLoading ? (
                                <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
                            ) : reports?.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">Nenhum relatório gerado ainda.</div>
                            ) : (
                                <div className="flex flex-col p-2 gap-2">
                                    {reports?.filter(r => categoryFilter === 'all' || r.categoria === categoryFilter || (categoryFilter === 'completo' && r.tipo === 'completo')).map((report) => (
                                        <div
                                            key={report.id}
                                            className={`
                                                group flex items-start p-3 rounded-lg border transition-all relative
                                                ${selectedReport?.id === report.id
                                                    ? 'bg-primary/5 border-primary/20 shadow-sm'
                                                    : 'bg-card border-transparent hover:border-border hover:shadow-xs hover:bg-accent/50'}
                                            `}
                                        >
                                            <button
                                                onClick={() => handleReportSelect(report)}
                                                className="flex-1 flex flex-col gap-1 text-left min-w-0"
                                            >
                                                <div className="flex justify-between items-start w-full pr-6">
                                                    <span className={`text-sm font-medium truncate ${selectedReport?.id === report.id ? 'text-primary' : 'text-foreground'}`}>
                                                        {report.titulo || `Análise ${report.tipo}`}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    {report.categoria && (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                            {report.categoria === 'estoque' ? '📦' : '📊'} {report.categoria}
                                                        </Badge>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {format(new Date(report.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                                                    </span>
                                                </div>
                                            </button>

                                            {/* Action Menu - Stop Propagation to prevent selection when clicking menu */}
                                            <div className="absolute top-2 right-2">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 data-[state=open]:opacity-100"
                                                        >
                                                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive cursor-pointer gap-2"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setReportToDelete(report.id);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Excluir Relatório
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </Card>
                </div>

                {/* Report Detail View - Full width/height */}
                <div className={`
                    ${!isMobileListVisible ? 'flex' : 'hidden'} 
                    md:flex flex-1 flex-col h-full overflow-hidden bg-background rounded-xl md:border md:shadow-sm
                `}>
                    {selectedReport ? (
                        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/20">
                            {/* Mobile Header with Back Button */}
                            <div className="md:hidden flex items-center gap-2 p-4 border-b bg-card">
                                <Button variant="ghost" size="icon" onClick={handleBackToList} className="-ml-2 h-8 w-8 hover:bg-transparent">
                                    <ChevronRight className="w-5 h-5 rotate-180" />
                                </Button>
                                <span className="font-semibold text-sm">Voltar para lista</span>
                            </div>

                            {/* Desktop/Content Header */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 pb-2 gap-4 bg-transparent">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="bg-background/80 backdrop-blur-sm shadow-sm border-primary/20 text-primary uppercase tracking-widest text-[10px]">
                                            Relatório {selectedReport.tipo}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(selectedReport.created_at), "PPP 'às' HH:mm", { locale: ptBR })}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                                        {(selectedReport as any).titulo || 'Análise de Negócio'}
                                    </h2>
                                </div>
                                <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF}>
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">Exportar</span> PDF
                                </Button>
                            </div>

                            {/* Content Scroll Area */}
                            <ScrollArea className="flex-1">
                                <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
                                    <ReportRenderer data={selectedReport.insights} />
                                    <div className="h-20" /> {/* Bottom spacer */}
                                </div>
                            </ScrollArea>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 bg-muted/5 border-2 border-dashed border-muted m-4 rounded-xl">
                            <div className="bg-muted/80 p-4 rounded-full mb-4">
                                <FileText className="w-12 h-12 opacity-50 text-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">Selecione um Relatório</h3>
                            <p className="text-center max-w-xs text-sm">
                                Escolha uma análise do histórico ao lado ou gere um novo relatório para começar.
                            </p>
                            <Button variant="outline" className="mt-6 md:hidden" onClick={handleGenerateClick}>
                                Gerar Nova Análise
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <AlertDialog open={!!reportToDelete} onOpenChange={(open) => !open && setReportToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O relatório será permanentemente removido do seu histórico.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => reportToDelete && deleteReport.mutate(reportToDelete)}
                        >
                            {deleteReport.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout>
    );
};

export default Reports;
