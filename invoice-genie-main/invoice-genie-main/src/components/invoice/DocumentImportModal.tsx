import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, FileText, Check, RotateCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface DocumentImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (data: any) => void;
}

export function DocumentImportModal({ open, onOpenChange, onConfirm }: DocumentImportModalProps) {
    const [step, setStep] = useState<'upload' | 'scanning' | 'review'>('upload');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [extractedData, setExtractedData] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper to compress image to WebP
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    // Ultra-aggressive reduction to guarantee < 6MB payload (aiming for < 1MB)
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

                    // Compress to WebP with 0.5 quality (Very High compression)
                    const dataUrl = canvas.toDataURL('image/webp', 0.5);
                    console.log('Image compressed. New Max Dimension:', MAX_DIMENSION);
                    resolve(dataUrl);
                };
            };
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setImagePreview(compressed);
                setRotation(0);
            } catch (error) {
                console.error('Compression error:', error);
                toast.error('Erro ao processar imagem.');
            }
        }
    };

    const [rotation, setRotation] = useState(0);

    const handleScan = async () => {
        if (!imagePreview) return;
        setStep('scanning');
        console.log('--- STARTING SCAN ---');
        console.log('Image Preview Length:', imagePreview.length);

        try {
            // If rotated, we might need to send the rotated image or just the original.
            // For AI, orientation usually doesn't matter as much, but for User Experience (Review), 
            // visual rotation is crucial. We will send the original for now to save bandwidth/processing 
            // unless we canvas-draw it. GPT-4o typically handles rotated text fine.

            console.log('Invoking extract-financial-data...');
            const { data, error } = await supabase.functions.invoke('extract-financial-data', {
                body: { image: imagePreview }
            });

            console.log('Supabase Invoke Result:', { data, error });

            if (error) {
                console.error('SDK Error Full Object:', error);
                throw new Error(error.message || 'Erro na requisição');
            }

            if (data?.error) {
                console.error('Function Logic Error (from 200 OK):', data.error);
                throw new Error(data.error);
            }

            console.log('Extraction Success. Data:', data);
            setExtractedData(data);
            setStep('review');
        } catch (error: any) {
            console.error('--- SCAN ERROR CAUGHT ---');
            console.error('Full Error Object:', error);
            console.error('Error Message:', error.message);

            let displayMsg = error.message || 'Erro ao processar imagem. Tente novamente.';

            if (displayMsg.includes('Unexpected end of JSON input')) {
                displayMsg = 'Erro de Conexão: O servidor demorou muito para responder (Timeout) ou a imagem é muito grande.';
            }

            toast.error(displayMsg);
            setStep('upload');
        }
    };

    const handleRotate = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    const handleConfirm = () => {
        onConfirm(extractedData);
        onOpenChange(false);
        // Reset state
        setTimeout(() => {
            setStep('upload');
            setImagePreview(null);
            setExtractedData(null);
            setRotation(0); // Reset rotation on confirm
        }, 500);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Digitalizar Documento</DialogTitle>
                    <DialogDescription>
                        Importe Notas Promissórias, Boletos ou Recibos.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Step 1: Upload */}
                    {step === 'upload' && (
                        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 gap-4">
                            {imagePreview ? (
                                <div className="flex flex-col gap-2 w-full items-center">
                                    <div className="relative w-full max-h-[400px] overflow-hidden flex justify-center bg-black/5 rounded-md">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="max-h-[400px] object-contain transition-transform duration-300"
                                            style={{ transform: `rotate(${rotation}deg)` }}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={handleRotate}>
                                            <RotateCw className="w-4 h-4 mr-2" />
                                            Girar
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => { setImagePreview(null); setRotation(0); }}
                                        >
                                            Trocar Imagem
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="p-4 bg-muted rounded-full">
                                        <Upload className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <h3 className="font-medium">Clique para selecionar ou arraste</h3>
                                        <p className="text-sm text-muted-foreground">PNG, JPG até 10MB</p>
                                    </div>
                                    <Button onClick={() => fileInputRef.current?.click()}>
                                        Selecionar Arquivo
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </>
                            )}
                        </div>
                    )}

                    {/* Step 2: Scanning */}
                    {step === 'scanning' && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <Loader2 className="w-12 h-12 animate-spin text-primary" />
                            <p className="text-lg font-medium">Analisando documento...</p>
                            <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos.</p>
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {step === 'review' && extractedData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="aspect-[3/4] relative border rounded-lg bg-muted/20 overflow-hidden flex items-center justify-center">
                                    <img
                                        src={imagePreview!}
                                        alt="Original"
                                        className="w-full h-full object-contain transition-transform duration-300"
                                        style={{ transform: `rotate(${rotation}deg)` }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b">
                                    <FileText className="w-5 h-5 text-primary" />
                                    <h3 className="font-semibold">Dados Extraídos</h3>
                                </div>

                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label>Tipo</Label>
                                            <Input value={extractedData.document_type} readOnly className="bg-muted" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Valor</Label>
                                            <Input value={extractedData.charge?.amount}
                                                onChange={e => setExtractedData({ ...extractedData, charge: { ...extractedData.charge, amount: e.target.value } })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label>Título / Descrição</Label>
                                        <Input value={extractedData.charge?.title}
                                            onChange={e => setExtractedData({ ...extractedData, charge: { ...extractedData.charge, title: e.target.value } })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label>Emissão</Label>
                                            <Input type="date" value={extractedData.charge?.issue_date}
                                                onChange={e => setExtractedData({ ...extractedData, charge: { ...extractedData.charge, issue_date: e.target.value } })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Vencimento</Label>
                                            <Input type="date" value={extractedData.charge?.due_date}
                                                onChange={e => setExtractedData({ ...extractedData, charge: { ...extractedData.charge, due_date: e.target.value } })}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t mt-2">
                                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">Dados do Cliente/Pagador</h4>
                                        <div className="space-y-2">
                                            <Input placeholder="Nome" value={extractedData.customer?.name}
                                                onChange={e => setExtractedData({ ...extractedData, customer: { ...extractedData.customer, name: e.target.value } })}
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input placeholder="CPF/CNPJ" value={extractedData.customer?.cpf_cnpj}
                                                    onChange={e => setExtractedData({ ...extractedData, customer: { ...extractedData.customer, cpf_cnpj: e.target.value } })}
                                                />
                                                <Input placeholder="Telefone" value={extractedData.customer?.phone}
                                                    onChange={e => setExtractedData({ ...extractedData, customer: { ...extractedData.customer, phone: e.target.value } })}
                                                />
                                            </div>
                                            <Input placeholder="Endereço Completo" value={
                                                extractedData.customer?.address ?
                                                    `${extractedData.customer.address.street}, ${extractedData.customer.address.number}` : ''
                                            } readOnly className="bg-muted text-xs" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {step === 'upload' && (
                        <Button onClick={handleScan} disabled={!imagePreview}>
                            Digitalizar
                        </Button>
                    )}
                    {step === 'review' && (
                        <>
                            <Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button>
                            <Button onClick={handleConfirm}>
                                <Check className="w-4 h-4 mr-2" />
                                Confirmar e Salvar
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
