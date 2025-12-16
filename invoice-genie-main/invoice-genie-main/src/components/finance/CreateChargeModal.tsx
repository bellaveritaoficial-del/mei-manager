import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, CalendarIcon, Upload, FileText, X } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

interface CreateChargeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CreateChargeModal({ open, onOpenChange, onSuccess }: CreateChargeModalProps) {
    const isMobile = useIsMobile();
    const [isLoading, setIsLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

    // Form State
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [type, setType] = useState<'pay' | 'receive'>('receive');
    const [customerId, setCustomerId] = useState<string>('');
    const [status, setStatus] = useState('open');

    useEffect(() => {
        if (open) {
            fetchCustomers();
        }
    }, [open]);

    const fetchCustomers = async () => {
        const { data } = await supabase.from('customers').select('id, name').order('name');
        if (data) setCustomers(data);
    };

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_DIMENSION = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_DIMENSION) {
                            height *= MAX_DIMENSION / width;
                            width = MAX_DIMENSION;
                        }
                    } else {
                        if (height > MAX_DIMENSION) {
                            width *= MAX_DIMENSION / height;
                            height = MAX_DIMENSION;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/webp', 0.5));
                };
            };
        });
    };

    const convertPdfToImage = async (file: File): Promise<string> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            // Reduzir escala do PDF para gerar imagem menor
            const viewport = page.getViewport({ scale: 1.0 });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context!, viewport } as any).promise;

            // Re-compress canvas result if needed, but toDataURL with 0.5 helps
            return canvas.toDataURL('image/webp', 0.5);
        } catch (error) {
            console.error('PDF Conversion Error:', error);
            throw new Error('Falha ao processar PDF. Tente uma imagem.');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        try {
            let base64Image = '';

            if (file.type === 'application/pdf') {
                base64Image = await convertPdfToImage(file);
            } else {
                base64Image = await compressImage(file);
            }

            console.log('Sending to AI...');
            const { data, error } = await supabase.functions.invoke('extract-financial-data', {
                body: { image: base64Image }
            });

            console.log('[DEBUG] AI Raw Response:', data);
            console.log('[DEBUG] AI Error:', error);

            console.log('AI Response:', { data, error });

            if (error) {
                // Check if it's a function not found (404) or timeout
                throw new Error(error.message || 'Erro de conexão com a IA');
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            if (data.charge) {
                if (data.charge.title) setTitle(data.charge.title);
                if (data.charge.amount) {
                    // Convert to string with 2 decimals (e.g. 500 -> "500.00")
                    // Then replace dot with comma for the mask (500,00)
                    const formatted = data.charge.amount.toFixed(2).replace('.', ',');
                    setAmount(formatted);
                }
                if (data.charge.due_date) {
                    const rawDate = data.charge.due_date.toString().trim();
                    // Regex identifying YYYY-MM-DD or YYYY/MM/DD
                    const isoMatch = rawDate.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);

                    if (isoMatch) {
                        const [_, year, month, day] = isoMatch;
                        setDueDate(`${day}/${month}/${year}`);
                    } else {
                        // Attempt to maintain what we have or format it if it looks like standard input
                        setDueDate(formatDate(rawDate));
                    }
                }
            }

            if (data.customer?.name) {
                // Try fuzzy match
                const match = customers.find(c =>
                    c.name.toLowerCase().includes(data.customer.name.toLowerCase()) ||
                    data.customer.name.toLowerCase().includes(c.name.toLowerCase())
                );

                if (match) {
                    setCustomerId(match.id);
                } else if (data.document_type === 'boleto' || data.document_type === 'invoice') {
                    // If logical sender found but not in DB, maybe warn user? 
                    // For now just toast
                    toast.info(`Cliente identificado: ${data.customer.name} (Não cadastrado)`);
                }
            }

            toast.success('Dados preenchidos via IA!');
        } catch (error) {
            console.error('Scan error:', error);
            const msg = error instanceof Error ? error.message : 'Erro ao processar arquivo';
            toast.error(msg);
        } finally {
            setIsScanning(false);
            // Reset input
            if (e.target) e.target.value = '';
        }
    };

    const formatDate = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '$1/$2')
            .replace(/(\d{2})(\d)/, '$1/$2')
            .replace(/(\d{4})\d+?$/, '$1');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Clean amount string to number (R$ 1.000,00 -> 1000.00)
            const numericAmount = parseFloat(
                amount.replace(/[^\d,]/g, '').replace(',', '.')
            );

            if (isNaN(numericAmount) || numericAmount <= 0) {
                toast.error('Valor inválido');
                return;
            }

            if (!title || !dueDate) {
                toast.error('Preencha os campos obrigatórios');
                return;
            }

            // Get authenticated user for RLS
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                console.error('Auth Error:', authError);
                toast.error('Erro de autenticação. Faça login novamente.');
                setIsLoading(false);
                return;
            }

            // [DEBUG] Log payload before insert
            const insertPayload = {
                title,
                amount: numericAmount,
                direction: type,
                due_date: dueDate.split('/').reverse().join('-'), // Convert DD/MM/YYYY to YYYY-MM-DD
                status,
                customer_id: customerId || null,
                user_id: user.id, // Required for RLS policy
            };
            console.log('[DEBUG] Insert Payload:', insertPayload);
            console.log('[DEBUG] Original Date State:', dueDate);

            // @ts-ignore - bypassing strict type check for now due to generated types mismatch
            const { error } = await supabase.from('charges').insert(insertPayload);

            if (error) throw error;

            toast.success('Cobrança criada com sucesso!');
            onOpenChange(false);
            if (onSuccess) onSuccess();
            resetForm();
        } catch (error: any) {
            console.error('Error creating charge:', error);
            toast.error(`Erro ao criar cobrança: ${error.message || error.details || 'Erro desconhecido'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setAmount('');
        setDueDate('');
        setType('receive');
        setCustomerId('');
        setStatus('open');
    };

    const formatCurrency = (value: string) => {
        let v = value.replace(/\D/g, '');
        v = (parseFloat(v) / 100).toFixed(2) + '';
        v = v.replace('.', ',');
        v = v.replace(/(\d)(\d{3})(\d{3}),/g, '$1.$2.$3,');
        v = v.replace(/(\d)(\d{3}),/g, '$1.$2,');
        return v === 'NaN' ? '' : v;
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmount(formatCurrency(e.target.value));
    };

    const FormContent = (
        <form id="create-charge-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Upload Banner */}
            <div className="bg-muted/30 border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors relative">
                <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    disabled={isScanning || isLoading}
                />
                {isScanning ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Lendo arquivo...</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                        <div className="p-2 bg-primary/10 rounded-full">
                            <Upload className="w-5 h-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Anexar Fatura ou Boleto</p>
                            <p className="text-xs text-muted-foreground">PDF ou Imagem (IA Preenche automático)</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="title">Descrição *</Label>
                <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Desenvolvimento de Site"
                    required
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="amount">Valor *</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">R$</span>
                        <Input
                            id="amount"
                            placeholder="0,00"
                            className="pl-9"
                            value={amount}
                            onChange={(e) => setAmount(formatCurrency(e.target.value))}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="receive">A Receber</SelectItem>
                            <SelectItem value="pay">A Pagar</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="dueDate">Vencimento *</Label>
                    <div className="relative">
                        <Input
                            id="dueDate"
                            placeholder="dd/mm/aaaa"
                            value={dueDate}
                            onChange={(e) => setDueDate(formatDate(e.target.value))}
                            maxLength={10}
                            required
                        />
                        <CalendarIcon className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="open">Em Aberto</SelectItem>
                            <SelectItem value="paid">Pago</SelectItem>
                            <SelectItem value="overdue">Vencido</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="customer">Cliente / Fornecedor</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                        {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </form>
    );

    const DesktopFooter = (
        <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
            </Button>
            <Button type="submit" form="create-charge-form" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Cobrança
            </Button>
        </DialogFooter>
    );

    const MobileFooter = (
        <DrawerFooter className="pt-2">
            <Button type="submit" form="create-charge-form" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Cobrança
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                Cancelar
            </Button>
        </DrawerFooter>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="max-h-[85vh] flex flex-col">
                    <DrawerHeader className="text-left">
                        <DrawerTitle>Nova Cobrança</DrawerTitle>
                        <DrawerDescription>
                            Adicione uma nova conta a pagar ou receber.
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4 overflow-y-auto pb-4">
                        {FormContent}
                    </div>
                    {MobileFooter}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Nova Cobrança</DialogTitle>
                    <DialogDescription>
                        Adicione uma nova conta a pagar ou receber.
                    </DialogDescription>
                </DialogHeader>
                {FormContent}
                {DesktopFooter}
            </DialogContent>
        </Dialog>
    );
}
