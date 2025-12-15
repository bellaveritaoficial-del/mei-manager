import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Brain, AlertTriangle, TrendingUp, Package, DollarSign, FileText, Lightbulb } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

interface AIAnalysisDisplayProps {
    analysis: string;
    logoUrl?: string;
    companyName?: string;
}

export const AIAnalysisDisplay = ({ analysis, logoUrl, companyName }: AIAnalysisDisplayProps) => {
    // Simple markdown parser for the specific format returned by the AI
    const sections = analysis.split('##').filter(Boolean).map(section => {
        const lines = section.trim().split('\n');
        const title = lines[0].trim();
        const content = lines.slice(1).join('\n').trim();
        return { title, content };
    });

    const getIconForTitle = (title: string) => {
        if (title.includes('FINANCEIRA') || title.includes('GASTOS')) return <DollarSign className="w-5 h-5 text-emerald-500" />;
        if (title.includes('GARGALOS') || title.includes('ALERTA')) return <AlertTriangle className="w-5 h-5 text-amber-500" />;
        if (title.includes('ESTOQUE')) return <Package className="w-5 h-5 text-blue-500" />;
        if (title.includes('MELHORIA') || title.includes('SUGESTÕES')) return <Lightbulb className="w-5 h-5 text-yellow-500" />;
        if (title.includes('NOTAS')) return <FileText className="w-5 h-5 text-purple-500" />;
        return <TrendingUp className="w-5 h-5 text-primary" />;
    };

    // Remove emojis and clean text for PDF
    const cleanTextForPDF = (text: string): string => {
        if (!text) return '';
        return text
            .replace(/##\s*/g, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/`/g, '')
            // whitelist allowed characters: alphanumeric, spaces, portuguese accents, basic punctuation
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

    const generatePDF = async () => {
        try {
            const doc = new jsPDF();
            const margin = 20;
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const maxWidth = pageWidth - (margin * 2);
            let yPos = margin;
            const headerHeight = 45;

            // =========== HEADER WITH LOGO ===========
            doc.setFillColor(103, 58, 183); // Purple header
            doc.rect(0, 0, pageWidth, headerHeight, 'F');

            let textStartX = margin;

            // Try to add logo if provided
            if (logoUrl) {
                try {
                    const logoBase64 = await loadImageAsBase64(logoUrl);
                    if (logoBase64) {
                        doc.setFillColor(255, 255, 255);
                        doc.circle(margin + 15, headerHeight / 2, 14, 'F');
                        doc.addImage(logoBase64, 'PNG', margin + 3, (headerHeight / 2) - 12, 24, 24);
                        textStartX = margin + 35;
                    }
                } catch (e) {
                    console.log('Could not load logo for PDF');
                }
            }

            // Company name
            doc.setFontSize(18);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.text(cleanTextForPDF(companyName || 'NF Control'), textStartX, 15);

            // Report title
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text("Relatorio de Analise de Estoque", textStartX, 25);

            // Date
            doc.setFontSize(9);
            doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')}`, textStartX, 35);

            yPos = 60;

            // =========== CHECK PAGE BREAK ===========
            const checkPageBreak = (heightNeeded: number) => {
                if (yPos + heightNeeded > pageHeight - margin) {
                    doc.addPage();
                    yPos = margin;
                }
            };

            // =========== SECTIONS ===========
            if (sections.length > 0) {
                sections.forEach((section, idx) => {
                    checkPageBreak(30);

                    const cleanTitle = cleanTextForPDF(section.title).toUpperCase();

                    // Section title with colored background
                    doc.setFillColor(242, 242, 247);
                    doc.setDrawColor(220, 220, 230);
                    doc.roundedRect(margin - 5, yPos - 6, maxWidth + 10, 12, 2, 2, 'FD');

                    doc.setFontSize(12);
                    doc.setTextColor(103, 58, 183);
                    doc.setFont("helvetica", "bold");
                    doc.text(cleanTitle, margin, yPos);
                    yPos += 14;

                    // Section content
                    doc.setFontSize(10);
                    doc.setTextColor(60, 60, 60);
                    doc.setFont("helvetica", "normal");

                    const contentLines = section.content.split('\n');

                    contentLines.forEach(line => {
                        let cleanLine = cleanTextForPDF(line);
                        if (!cleanLine) {
                            yPos += 3;
                            return;
                        }

                        checkPageBreak(8);

                        // Handle list items
                        let xOffset = margin;
                        if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                            xOffset += 5;
                            cleanLine = "•  " + cleanLine.replace(/^[-•]\s*/, '');
                        }

                        const wrappedLines = doc.splitTextToSize(cleanLine, maxWidth - (xOffset - margin));
                        doc.text(wrappedLines, xOffset, yPos);
                        yPos += (wrappedLines.length * 5) + 2;
                    });

                    yPos += 8; // Space between sections
                });
            } else {
                // Fallback for plain text
                const cleanAnalysis = cleanTextForPDF(analysis);
                doc.setFontSize(10);
                doc.setTextColor(60, 60, 60);
                const wrappedText = doc.splitTextToSize(cleanAnalysis, maxWidth);
                doc.text(wrappedText, margin, yPos);
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

            doc.save(`analise-estoque-${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success("Relatorio PDF baixado com sucesso!");
        } catch (err) {
            console.error(err);
            toast.error("Erro ao gerar PDF");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={generatePDF} variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5">
                    <Download className="w-4 h-4" />
                    Baixar Relatório PDF
                </Button>
            </div>

            {sections.length === 0 ? (
                // Fallback for simple text without ## headers
                <Card className="border-l-4 border-l-primary/50 overflow-hidden">
                    <CardHeader className="bg-muted/30 pb-3">
                        <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            Análise de Estoque
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                            {analysis}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-1">
                    {sections.map((section, idx) => (
                        <Card key={idx} className="border-l-4 border-l-primary/50 overflow-hidden hover:shadow-md transition-shadow">
                            <CardHeader className="bg-muted/30 pb-3">
                                <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                                    {getIconForTitle(section.title)}
                                    {section.title.replace(/^\d+\.\s*/, '')} {/* Clean numbering if present */}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                                    {section.content.split('\n').map((line, lineIdx) => {
                                        const cleanLine = line.trim();
                                        if (!cleanLine) return <br key={lineIdx} />;

                                        if (cleanLine.startsWith('-') || cleanLine.startsWith('•')) {
                                            // Render lists nicely
                                            const content = cleanLine.substring(1).trim();
                                            // Bold parsing inside list items
                                            const parts = content.split(/(\*\*.*?\*\*)/g);
                                            return (
                                                <div key={lineIdx} className="flex gap-2 items-start ml-2">
                                                    <span className="text-primary mt-1.5">•</span>
                                                    <span>
                                                        {parts.map((part, pIdx) => {
                                                            if (part.startsWith('**') && part.endsWith('**')) {
                                                                return <strong key={pIdx} className="text-foreground font-medium">{part.slice(2, -2)}</strong>;
                                                            }
                                                            return part;
                                                        })}
                                                    </span>
                                                </div>
                                            );
                                        }

                                        // Regular text
                                        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
                                        return (
                                            <p key={lineIdx}>
                                                {parts.map((part, pIdx) => {
                                                    if (part.startsWith('**') && part.endsWith('**')) {
                                                        return <strong key={pIdx} className="text-foreground font-medium">{part.slice(2, -2)}</strong>;
                                                    }
                                                    return part;
                                                })}
                                            </p>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
