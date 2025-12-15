import { useState, useRef } from "react";
import { useInvoices } from "@/hooks/useInvoices";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import {
    Camera, FileText, Upload, Loader2, Plus, Trash2,
    Image as ImageIcon, Sparkles, X, CheckCircle2,
    Building2, Package, Calculator, FileStack, Info
} from "lucide-react";

// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const convertImageToWebP = async (file: File, maxWidth = 1920): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
            let width = img.width, height = img.height;
            if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Canvas error')); return; }
            ctx.drawImage(img, 0, 0, width, height);
            resolve({ base64: canvas.toDataURL('image/webp', 0.8).split(',')[1], mimeType: 'image/webp' });
        };
        img.onerror = () => reject(new Error('Image load error'));
        img.src = URL.createObjectURL(file);
    });
};

// --- Types ---
interface ProductItem {
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
}

interface InvoiceFormData {
    tipo_nota: "nfe" | "nfse" | "nfce";
    numero: string;
    serie: string;
    chave_acesso: string;
    codigo_verificacao: string;
    natureza_operacao: string;
    tipo_operacao: number;
    data_emissao: string;
    data_saida: string;
    dest_razao_social: string;
    dest_cnpj: string;
    dest_inscricao_estadual: string;
    dest_endereco: string;
    dest_municipio: string;
    dest_uf: string;
    dest_cep: string;
    dest_telefone: string;
    dest_email: string;
    valor_total_nota: number;
    valor_total_produtos: number;
    valor_frete: number;
    valor_seguro: number;
    desconto: number;
    bc_icms: number;
    valor_icms: number;
    bc_icms_st: number;
    valor_icms_st: number;
    valor_ipi: number;
    valor_pis: number;
    valor_cofins: number;
    valor_ii: number;
    valor_issqn: number;
    outras_despesas: number;
    valor_aproximado_tributos: number;
    codigo_servico: string;
    descricao_servico: string;
    valor_servicos: number;
    valor_deducoes: number;
    bc_iss: number;
    aliquota_iss: number;
    valor_iss: number;
    valor_iss_retido: number;
    valor_inss: number;
    valor_irrf: number;
    valor_csll: number;
    valor_credito: number;
    iss_retido: boolean;
    municipio_prestacao: string;
    numero_rps: string;
    serie_rps: string;
    informacoes_adicionais: string;
    status: "pendente" | "pago" | "vencido";
}

const initialFormData: InvoiceFormData = {
    tipo_nota: "nfe", numero: "", serie: "001", chave_acesso: "", codigo_verificacao: "",
    natureza_operacao: "VENDA DE MERCADORIA", tipo_operacao: 1,
    data_emissao: new Date().toISOString().split("T")[0],
    data_saida: new Date().toISOString().split("T")[0],
    dest_razao_social: "", dest_cnpj: "", dest_inscricao_estadual: "",
    dest_endereco: "", dest_municipio: "", dest_uf: "SP", dest_cep: "",
    dest_telefone: "", dest_email: "",
    valor_total_nota: 0, valor_total_produtos: 0, valor_frete: 0, valor_seguro: 0, desconto: 0,
    bc_icms: 0, valor_icms: 0, bc_icms_st: 0, valor_icms_st: 0, valor_ipi: 0,
    valor_pis: 0, valor_cofins: 0, valor_ii: 0, valor_issqn: 0,
    outras_despesas: 0, valor_aproximado_tributos: 0,
    codigo_servico: "", descricao_servico: "", valor_servicos: 0, valor_deducoes: 0,
    bc_iss: 0, aliquota_iss: 0, valor_iss: 0, valor_iss_retido: 0,
    valor_inss: 0, valor_irrf: 0, valor_csll: 0, valor_credito: 0,
    iss_retido: false, municipio_prestacao: "", numero_rps: "", serie_rps: "",
    informacoes_adicionais: "", status: "pendente",
};

const initialProduct: ProductItem = {
    codigo: "", descricao: "", ncm: "", cfop: "5102", unidade: "UN",
    quantidade: 1, valor_unitario: 0, valor_total: 0,
};

interface InvoiceCaptureModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const InvoiceCaptureModal = ({ open, onOpenChange }: InvoiceCaptureModalProps) => {
    const { createInvoice } = useInvoices();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState("ocr");

    // OCR State
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Manual/Edit Form State
    const [formData, setFormData] = useState<InvoiceFormData>(initialFormData);
    const [produtos, setProdutos] = useState<ProductItem[]>([{ ...initialProduct }]);

    // --- Recalculates totals ---
    const recalculateTotals = (items: ProductItem[], currentFormData: InvoiceFormData) => {
        const totalProd = items.reduce((sum, p) => sum + p.valor_total, 0);
        return {
            ...currentFormData,
            valor_total_produtos: totalProd,
            valor_total_nota: totalProd + currentFormData.valor_frete + currentFormData.valor_seguro - currentFormData.desconto + currentFormData.outras_despesas
        };
    };

    // --- Product Handlers ---
    const handleProductChange = (index: number, field: keyof ProductItem, value: string | number) => {
        const updated = [...produtos];
        (updated[index] as any)[field] = value;
        if (field === "quantidade" || field === "valor_unitario") {
            updated[index].valor_total = updated[index].quantidade * updated[index].valor_unitario;
        }
        setProdutos(updated);
        setFormData(prev => recalculateTotals(updated, prev));
    };

    const handleAddProduct = () => setProdutos([...produtos, { ...initialProduct }]);
    const handleRemoveProduct = (i: number) => {
        if (produtos.length <= 1) return;
        const updated = produtos.filter((_, idx) => idx !== i);
        setProdutos(updated);
        setFormData(prev => recalculateTotals(updated, prev));
    };

    // --- Form Submit ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.numero) { toast.error("Número da nota é obrigatório."); return; }
        setIsSubmitting(true);
        try {
            await createInvoice.mutateAsync({ invoice: formData, items: produtos });
            toast.success("Nota fiscal salva com sucesso!");
            resetForm();
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar nota");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData(initialFormData);
        setProdutos([{ ...initialProduct }]);
        setSelectedFiles([]);
    };

    // --- OCR Handlers ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            if (selectedFiles.length + newFiles.length > 5) {
                toast.error("Máximo de 5 arquivos."); return;
            }
            setSelectedFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (idx: number) => setSelectedFiles(prev => prev.filter((_, i) => i !== idx));

    const processBatchOCR = async () => {
        if (selectedFiles.length === 0) return;
        setIsProcessingBatch(true);
        let successCount = 0;
        for (const file of selectedFiles) {
            try {
                let base64Data: string, contentType: string;
                if (file.type.startsWith('image/')) {
                    const r = await convertImageToWebP(file); base64Data = r.base64; contentType = r.mimeType;
                } else {
                    base64Data = await fileToBase64(file); contentType = 'application/pdf';
                }
                const { data, error } = await supabase.functions.invoke('process-invoice-ocr', { body: { image_base64: base64Data, content_type: contentType } });
                if (error) throw error;
                if (data?.success && data?.data) {
                    const ocr = data.data;
                    const newInvoice = mapOCRToInvoice(ocr);
                    const newItems = mapOCRToItems(ocr);
                    await createInvoice.mutateAsync({ invoice: newInvoice, items: newItems });
                    successCount++;
                }
            } catch (err) { console.error("Error:", file.name, err); toast.error(`Erro: ${file.name}`); }
        }
        if (successCount > 0) { toast.success(`${successCount} notas salvas!`); onOpenChange(false); resetForm(); }
        setIsProcessingBatch(false);
    };

    const mapOCRToInvoice = (ocrData: any): InvoiceFormData => {
        const t = ocrData.totais || {}, d = ocrData.destinatario || ocrData.tomador || {};
        return { ...initialFormData, numero: ocrData.numero || `AI-${Date.now()}`, data_emissao: ocrData.data_emissao || new Date().toISOString().split('T')[0], dest_razao_social: d.razao_social || "Consumidor Final", dest_cnpj: d.cnpj || "", valor_total_nota: parseFloat(t.valor_total_nota || ocrData.valor_total_nota) || 0, status: "pendente" };
    };
    const mapOCRToItems = (ocrData: any): ProductItem[] => {
        if (!ocrData.produtos?.length) return [{ ...initialProduct, descricao: "Produto Diverso" }];
        return ocrData.produtos.map((p: any) => ({ ...initialProduct, descricao: p.descricao || "Produto", quantidade: parseFloat(p.quantidade) || 1, valor_unitario: parseFloat(p.valor_unitario) || 0, valor_total: parseFloat(p.valor_total) || 0 }));
    };

    // Shorthand for input changes
    const handleInputChange = (field: keyof InvoiceFormData, value: any) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            // Recalculate total if relevant field changes
            if (['valor_frete', 'valor_seguro', 'desconto', 'outras_despesas'].includes(field)) {
                updated.valor_total_nota = updated.valor_total_produtos + (updated.valor_frete || 0) + (updated.valor_seguro || 0) - (updated.desconto || 0) + (updated.outras_despesas || 0);
            }
            return updated;
        });
    };

    return (
        <Dialog onOpenChange={onOpenChange} open={open}>
            <DialogContent className="w-[98vw] max-w-4xl h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col p-0 gap-0 rounded-xl">
                <DialogHeader className="p-6 pb-4 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Camera className="w-5 h-5 text-primary" />
                        Capturar Nota Fiscal
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 pt-2 shrink-0">
                        <TabsList className="grid w-full grid-cols-2 h-10">
                            <TabsTrigger value="ocr" className="gap-2 text-sm"><Sparkles className="w-4 h-4" /> Captura em Lote (IA)</TabsTrigger>
                            <TabsTrigger value="manual" className="gap-2 text-sm"><FileText className="w-4 h-4" /> Cadastro Manual</TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1">
                        {/* ========== OCR TAB ========== */}
                        <TabsContent value="ocr" className="mt-0 p-6 space-y-6">
                            <div className="border-2 border-dashed rounded-xl p-10 text-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
                                <div className="flex flex-col items-center gap-4">
                                    <div className="p-4 rounded-full bg-primary/10 text-primary"><Upload className="w-8 h-8" /></div>
                                    <div><h3 className="font-semibold text-lg">Clique ou arraste até 5 arquivos</h3><p className="text-sm text-muted-foreground mt-1">Suporta JPG, PNG e PDF</p></div>
                                </div>
                            </div>
                            {selectedFiles.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-medium text-sm text-muted-foreground">Arquivos ({selectedFiles.length}/5)</h4>
                                    <div className="grid gap-2">{selectedFiles.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-card border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">{file.type.includes('pdf') ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}</div>
                                                <div className="text-sm"><p className="font-medium truncate max-w-[200px]">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => removeFile(i)}><X className="w-4 h-4" /></Button>
                                        </div>
                                    ))}</div>
                                    <Button className="w-full h-12 text-lg gap-2 mt-4" onClick={processBatchOCR} disabled={isProcessingBatch}>
                                        {isProcessingBatch ? <Loader2 className="animate-spin" /> : <Sparkles />}
                                        {isProcessingBatch ? "Processando..." : "Processar e Criar Notas"}
                                    </Button>
                                </div>
                            )}
                        </TabsContent>

                        {/* ========== MANUAL TAB ========== */}
                        <TabsContent value="manual" className="mt-0 p-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Accordion type="multiple" defaultValue={["dados", "dest", "itens", "totais"]} className="space-y-3">

                                    {/* SECTION: Dados da Nota */}
                                    <AccordionItem value="dados" className="border rounded-lg overflow-hidden">
                                        <AccordionTrigger className="px-4 py-3 bg-muted/30 hover:bg-muted/50 text-sm font-semibold">
                                            <span className="flex items-center gap-2"><FileStack className="w-4 h-4 text-primary" /> Dados da Nota</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 space-y-4">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="space-y-1.5"><Label className="text-xs">Tipo</Label>
                                                    <Select value={formData.tipo_nota} onValueChange={(v: any) => handleInputChange('tipo_nota', v)}>
                                                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                        <SelectContent><SelectItem value="nfe">NF-e</SelectItem><SelectItem value="nfse">NFS-e</SelectItem><SelectItem value="nfce">NFC-e</SelectItem></SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5"><Label className="text-xs">Número *</Label><Input className="h-9" required value={formData.numero} onChange={e => handleInputChange('numero', e.target.value)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">Série</Label><Input className="h-9" value={formData.serie} onChange={e => handleInputChange('serie', e.target.value)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">Status</Label>
                                                    <Select value={formData.status} onValueChange={(v: any) => handleInputChange('status', v)}>
                                                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                        <SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="pago">Pago</SelectItem><SelectItem value="vencido">Vencido</SelectItem></SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div className="space-y-1.5"><Label className="text-xs">Data Emissão *</Label><Input type="date" className="h-9" required value={formData.data_emissao} onChange={e => handleInputChange('data_emissao', e.target.value)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">Data Saída</Label><Input type="date" className="h-9" value={formData.data_saida} onChange={e => handleInputChange('data_saida', e.target.value)} /></div>
                                                <div className="space-y-1.5 md:col-span-1"><Label className="text-xs">Natureza Operação</Label><Input className="h-9" value={formData.natureza_operacao} onChange={e => handleInputChange('natureza_operacao', e.target.value)} /></div>
                                            </div>
                                            <div className="space-y-1.5"><Label className="text-xs">Chave de Acesso (44 dígitos)</Label><Input className="h-9 font-mono text-xs" maxLength={44} value={formData.chave_acesso} onChange={e => handleInputChange('chave_acesso', e.target.value)} /></div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    {/* SECTION: Destinatário */}
                                    <AccordionItem value="dest" className="border rounded-lg overflow-hidden">
                                        <AccordionTrigger className="px-4 py-3 bg-muted/30 hover:bg-muted/50 text-sm font-semibold">
                                            <span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Destinatário / Tomador</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5"><Label className="text-xs">Razão Social / Nome</Label><Input className="h-9" value={formData.dest_razao_social} onChange={e => handleInputChange('dest_razao_social', e.target.value)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">CNPJ / CPF</Label><Input className="h-9" value={formData.dest_cnpj} onChange={e => handleInputChange('dest_cnpj', e.target.value)} /></div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="space-y-1.5 col-span-2"><Label className="text-xs">Endereço</Label><Input className="h-9" value={formData.dest_endereco} onChange={e => handleInputChange('dest_endereco', e.target.value)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">CEP</Label><Input className="h-9" value={formData.dest_cep} onChange={e => handleInputChange('dest_cep', e.target.value)} /></div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="space-y-1.5"><Label className="text-xs">Município</Label><Input className="h-9" value={formData.dest_municipio} onChange={e => handleInputChange('dest_municipio', e.target.value)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">UF</Label><Input className="h-9" maxLength={2} value={formData.dest_uf} onChange={e => handleInputChange('dest_uf', e.target.value.toUpperCase())} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">Telefone</Label><Input className="h-9" value={formData.dest_telefone} onChange={e => handleInputChange('dest_telefone', e.target.value)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input className="h-9" type="email" value={formData.dest_email} onChange={e => handleInputChange('dest_email', e.target.value)} /></div>
                                            </div>
                                            <div className="space-y-1.5"><Label className="text-xs">Inscrição Estadual</Label><Input className="h-9" value={formData.dest_inscricao_estadual} onChange={e => handleInputChange('dest_inscricao_estadual', e.target.value)} /></div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    {/* SECTION: Itens */}
                                    <AccordionItem value="itens" className="border rounded-lg overflow-hidden">
                                        <AccordionTrigger className="px-4 py-3 bg-muted/30 hover:bg-muted/50 text-sm font-semibold">
                                            <span className="flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Produtos / Serviços ({produtos.length})</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 space-y-3">
                                            {produtos.map((prod, idx) => (
                                                <div key={idx} className="border rounded-lg p-3 bg-card/50 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                                                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleRemoveProduct(idx)} disabled={produtos.length <= 1}><Trash2 className="w-3.5 h-3.5" /></Button>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-3">
                                                        <div className="space-y-1 col-span-3"><Label className="text-xs">Descrição *</Label><Input className="h-8 text-sm" value={prod.descricao} onChange={e => handleProductChange(idx, 'descricao', e.target.value)} required /></div>
                                                        <div className="space-y-1"><Label className="text-xs">Código</Label><Input className="h-8 text-sm" value={prod.codigo} onChange={e => handleProductChange(idx, 'codigo', e.target.value)} /></div>
                                                    </div>
                                                    <div className="grid grid-cols-5 gap-3">
                                                        <div className="space-y-1"><Label className="text-xs">NCM</Label><Input className="h-8 text-sm" value={prod.ncm} onChange={e => handleProductChange(idx, 'ncm', e.target.value)} /></div>
                                                        <div className="space-y-1"><Label className="text-xs">CFOP</Label><Input className="h-8 text-sm" value={prod.cfop} onChange={e => handleProductChange(idx, 'cfop', e.target.value)} /></div>
                                                        <div className="space-y-1"><Label className="text-xs">Unid.</Label><Input className="h-8 text-sm" value={prod.unidade} onChange={e => handleProductChange(idx, 'unidade', e.target.value)} /></div>
                                                        <div className="space-y-1"><Label className="text-xs">Qtd</Label><Input type="number" className="h-8 text-sm" value={prod.quantidade} onChange={e => handleProductChange(idx, 'quantidade', parseFloat(e.target.value) || 0)} /></div>
                                                        <div className="space-y-1"><Label className="text-xs">Valor Unit.</Label><Input type="number" step="0.01" className="h-8 text-sm" value={prod.valor_unitario} onChange={e => handleProductChange(idx, 'valor_unitario', parseFloat(e.target.value) || 0)} /></div>
                                                    </div>
                                                    <div className="flex justify-end"><p className="text-sm font-semibold">Total: R$ {prod.valor_total.toFixed(2)}</p></div>
                                                </div>
                                            ))}
                                            <Button type="button" variant="outline" size="sm" onClick={handleAddProduct} className="w-full mt-2"><Plus className="w-4 h-4 mr-2" /> Adicionar Item</Button>
                                        </AccordionContent>
                                    </AccordionItem>

                                    {/* SECTION: Totais e Frete */}
                                    <AccordionItem value="totais" className="border rounded-lg overflow-hidden">
                                        <AccordionTrigger className="px-4 py-3 bg-muted/30 hover:bg-muted/50 text-sm font-semibold">
                                            <span className="flex items-center gap-2"><Calculator className="w-4 h-4 text-primary" /> Totais e Descontos</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 space-y-4">
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                <div className="space-y-1.5"><Label className="text-xs">Total Produtos</Label><Input className="h-9 bg-muted" readOnly value={formData.valor_total_produtos.toFixed(2)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">Frete</Label><Input type="number" step="0.01" className="h-9" value={formData.valor_frete} onChange={e => handleInputChange('valor_frete', parseFloat(e.target.value) || 0)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">Seguro</Label><Input type="number" step="0.01" className="h-9" value={formData.valor_seguro} onChange={e => handleInputChange('valor_seguro', parseFloat(e.target.value) || 0)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">Desconto</Label><Input type="number" step="0.01" className="h-9" value={formData.desconto} onChange={e => handleInputChange('desconto', parseFloat(e.target.value) || 0)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">Outras Desp.</Label><Input type="number" step="0.01" className="h-9" value={formData.outras_despesas} onChange={e => handleInputChange('outras_despesas', parseFloat(e.target.value) || 0)} /></div>
                                            </div>
                                            <div className="p-4 rounded-lg bg-primary/10 flex justify-between items-center">
                                                <span className="font-bold text-primary">TOTAL DA NOTA</span>
                                                <span className="text-2xl font-bold text-primary">R$ {formData.valor_total_nota.toFixed(2)}</span>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    {/* SECTION: Impostos */}
                                    <AccordionItem value="impostos" className="border rounded-lg overflow-hidden">
                                        <AccordionTrigger className="px-4 py-3 bg-muted/30 hover:bg-muted/50 text-sm font-semibold">
                                            <span className="flex items-center gap-2"><Calculator className="w-4 h-4 text-orange-500" /> Impostos (NF-e)</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 space-y-4">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="space-y-1.5"><Label className="text-xs">Base ICMS</Label><Input type="number" step="0.01" className="h-9" value={formData.bc_icms} onChange={e => handleInputChange('bc_icms', parseFloat(e.target.value) || 0)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">Valor ICMS</Label><Input type="number" step="0.01" className="h-9" value={formData.valor_icms} onChange={e => handleInputChange('valor_icms', parseFloat(e.target.value) || 0)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">Base ICMS ST</Label><Input type="number" step="0.01" className="h-9" value={formData.bc_icms_st} onChange={e => handleInputChange('bc_icms_st', parseFloat(e.target.value) || 0)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">Valor ICMS ST</Label><Input type="number" step="0.01" className="h-9" value={formData.valor_icms_st} onChange={e => handleInputChange('valor_icms_st', parseFloat(e.target.value) || 0)} /></div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="space-y-1.5"><Label className="text-xs">Valor IPI</Label><Input type="number" step="0.01" className="h-9" value={formData.valor_ipi} onChange={e => handleInputChange('valor_ipi', parseFloat(e.target.value) || 0)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">Valor PIS</Label><Input type="number" step="0.01" className="h-9" value={formData.valor_pis} onChange={e => handleInputChange('valor_pis', parseFloat(e.target.value) || 0)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">Valor COFINS</Label><Input type="number" step="0.01" className="h-9" value={formData.valor_cofins} onChange={e => handleInputChange('valor_cofins', parseFloat(e.target.value) || 0)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">Valor II</Label><Input type="number" step="0.01" className="h-9" value={formData.valor_ii} onChange={e => handleInputChange('valor_ii', parseFloat(e.target.value) || 0)} /></div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div className="space-y-1.5"><Label className="text-xs">Valor ISSQN</Label><Input type="number" step="0.01" className="h-9" value={formData.valor_issqn} onChange={e => handleInputChange('valor_issqn', parseFloat(e.target.value) || 0)} /></div>
                                                <div className="space-y-1.5"><Label className="text-xs">Tributos Aprox.</Label><Input type="number" step="0.01" className="h-9" value={formData.valor_aproximado_tributos} onChange={e => handleInputChange('valor_aproximado_tributos', parseFloat(e.target.value) || 0)} /></div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    {/* SECTION: Impostos NFS-e (Serviços) - Conditionally */}
                                    {formData.tipo_nota === 'nfse' && (
                                        <AccordionItem value="impostos_nfse" className="border rounded-lg overflow-hidden border-blue-500/30">
                                            <AccordionTrigger className="px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-sm font-semibold">
                                                <span className="flex items-center gap-2 text-blue-600"><Calculator className="w-4 h-4" /> Impostos (NFS-e / Serviços)</span>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-4 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-1.5"><Label className="text-xs">Código do Serviço</Label><Input className="h-9" value={formData.codigo_servico} onChange={e => handleInputChange('codigo_servico', e.target.value)} /></div>
                                                    <div className="space-y-1.5 md:col-span-2"><Label className="text-xs">Descrição do Serviço</Label><Input className="h-9" value={formData.descricao_servico} onChange={e => handleInputChange('descricao_servico', e.target.value)} /></div>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="space-y-1.5"><Label className="text-xs">Base ISS</Label><Input type="number" step="0.01" className="h-9" value={formData.bc_iss} onChange={e => handleInputChange('bc_iss', parseFloat(e.target.value) || 0)} /></div>
                                                    <div className="space-y-1.5"><Label className="text-xs">Alíquota ISS (%)</Label><Input type="number" step="0.01" className="h-9" value={formData.aliquota_iss} onChange={e => handleInputChange('aliquota_iss', parseFloat(e.target.value) || 0)} /></div>
                                                    <div className="space-y-1.5"><Label className="text-xs">Valor ISS</Label><Input type="number" step="0.01" className="h-9" value={formData.valor_iss} onChange={e => handleInputChange('valor_iss', parseFloat(e.target.value) || 0)} /></div>
                                                    <div className="space-y-1.5"><Label className="text-xs">ISS Retido</Label><Input type="number" step="0.01" className="h-9" value={formData.valor_iss_retido} onChange={e => handleInputChange('valor_iss_retido', parseFloat(e.target.value) || 0)} /></div>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="space-y-1.5"><Label className="text-xs">Valor INSS</Label><Input type="number" step="0.01" className="h-9" value={formData.valor_inss} onChange={e => handleInputChange('valor_inss', parseFloat(e.target.value) || 0)} /></div>
                                                    <div className="space-y-1.5"><Label className="text-xs">Valor IRRF</Label><Input type="number" step="0.01" className="h-9" value={formData.valor_irrf} onChange={e => handleInputChange('valor_irrf', parseFloat(e.target.value) || 0)} /></div>
                                                    <div className="space-y-1.5"><Label className="text-xs">Valor CSLL</Label><Input type="number" step="0.01" className="h-9" value={formData.valor_csll} onChange={e => handleInputChange('valor_csll', parseFloat(e.target.value) || 0)} /></div>
                                                    <div className="space-y-1.5"><Label className="text-xs">Valor Crédito</Label><Input type="number" step="0.01" className="h-9" value={formData.valor_credito} onChange={e => handleInputChange('valor_credito', parseFloat(e.target.value) || 0)} /></div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-1.5"><Label className="text-xs">Município Prestação</Label><Input className="h-9" value={formData.municipio_prestacao} onChange={e => handleInputChange('municipio_prestacao', e.target.value)} /></div>
                                                    <div className="space-y-1.5"><Label className="text-xs">Nº RPS</Label><Input className="h-9" value={formData.numero_rps} onChange={e => handleInputChange('numero_rps', e.target.value)} /></div>
                                                    <div className="space-y-1.5"><Label className="text-xs">Série RPS</Label><Input className="h-9" value={formData.serie_rps} onChange={e => handleInputChange('serie_rps', e.target.value)} /></div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    )}

                                    {/* SECTION: Informações Adicionais */}
                                    <AccordionItem value="info" className="border rounded-lg overflow-hidden">
                                        <AccordionTrigger className="px-4 py-3 bg-muted/30 hover:bg-muted/50 text-sm font-semibold">
                                            <span className="flex items-center gap-2"><Info className="w-4 h-4 text-primary" /> Informações Adicionais</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4">
                                            <Textarea rows={3} placeholder="Observações, informações complementares..." value={formData.informacoes_adicionais} onChange={e => handleInputChange('informacoes_adicionais', e.target.value)} />
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>

                                <Button type="submit" className="w-full h-12 text-base" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                                    Salvar Nota Fiscal
                                </Button>
                            </form>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
