import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Camera, Upload, Sparkles, X, ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useInventory } from '@/hooks/useInventory';

interface ProductModalProps {
    onClose: () => void;
    productToEdit?: any; // If passed, we are in edit mode
}

export function ProductModal({ onClose, productToEdit }: ProductModalProps) {
    const { createProduct, updateProduct } = useInventory();
    const isEditMode = !!productToEdit;
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(productToEdit?.image_url || null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        codigo: '',
        codigo_barras: '',
        descricao: '',
        ncm: '',
        unidade: 'UN',
        marca: '',
        preco_custo: 0,
        preco_venda: 0,
        quantidade_atual: 0,
        quantidade_minima: 0,
        categoria: '',
        observacoes: '', // Optional add
        ...productToEdit
    });

    useEffect(() => {
        if (productToEdit) {
            setFormData(prev => ({ ...prev, ...productToEdit }));
            setImagePreview(productToEdit.image_url);
        }
    }, [productToEdit]);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await processImage(file);
        }
    };

    const processImage = async (file: File) => {
        // 1. Client-side compression to WebP
        const compressedFile = await compressImage(file);
        setImageFile(compressedFile);

        // 2. Preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
    };

    const compressImage = (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; // Resize for web
                const scale = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scale;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], "product.webp", { type: 'image/webp' }));
                    } else {
                        reject(new Error("Compression failed"));
                    }
                }, 'image/webp', 0.8);
            };
            img.onerror = reject;
        });
    };

    const analyzeImage = async () => {
        if (!imagePreview) return;
        setIsAnalyzing(true);
        try {
            // Convert preview (base64) to just content
            const base64Content = imagePreview.split(',')[1];

            const { data, error } = await supabase.functions.invoke('analyze-product', {
                body: { image: base64Content }
            });

            if (error) throw error;

            console.log("AI Analysis:", data);

            setFormData(prev => ({
                ...prev,
                descricao: data.descricao || prev.descricao,
                categoria: data.categoria || prev.categoria,
                marca: data.marca || prev.marca,
                unidade: data.unidade || prev.unidade,
                codigo_barras: data.codigo_barras || prev.codigo_barras,
                quantidade_atual: data.quantidade_atual || prev.quantidade_atual,
                preco_custo: data.preco_custo || prev.preco_custo,
                preco_venda: data.preco_venda || prev.preco_venda,
            }));

            toast.success("Produto analisado com sucesso!");

        } catch (error) {
            console.error(error);
            toast.error("Erro ao analisar imagem com IA.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            let imageUrl = imagePreview;

            // Upload image if changed
            if (imageFile) {
                const fileName = `${Date.now()}-${imageFile.name}`;
                const { data, error } = await supabase.storage
                    .from('product-images')
                    .upload(fileName, imageFile);

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(fileName);

                imageUrl = publicUrl;
            }

            const dataToSave = { ...formData, image_url: imageUrl };

            if (productToEdit) {
                await updateProduct.mutateAsync({ id: productToEdit.id, ...dataToSave });
                toast.success('Produto atualizado!');
            } else {
                await createProduct.mutateAsync(dataToSave);
                toast.success('Produto cadastrado!');
            }
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao salvar');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DialogContent className="w-[95vw] sm:max-w-[600px] md:max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl">
            <DialogHeader>
                <DialogTitle>{productToEdit ? 'Editar Produto' : 'Novo Produto Inteligente 🧠'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Column: Image */}
                <div className="md:col-span-1 space-y-4">
                    <div
                        className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors bg-muted/20"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {imagePreview ? (
                            <>
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium">
                                    Trocar Imagem
                                </div>
                            </>
                        ) : (
                            <div className="text-center p-4">
                                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Arraste ou clique</p>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageSelect}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            <Camera className="w-4 h-4 mr-2" />
                            Foto
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={analyzeImage}
                            disabled={!imagePreview || isAnalyzing}
                        >
                            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            IA Analisar
                        </Button>
                    </div>
                </div>

                {/* Right Column: Fields */}
                <div className="md:col-span-2 space-y-4">
                    <Tabs defaultValue="gera" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="gera">Geral</TabsTrigger>
                            <TabsTrigger value="fisc">Fiscal & Preço</TabsTrigger>
                        </TabsList>

                        <TabsContent value="gera" className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Descrição do Produto</Label>
                                <Input
                                    value={formData.descricao}
                                    onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                    placeholder="Ex: Coca-Cola 350ml Lata"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Categoria</Label>
                                    <Input
                                        value={formData.categoria}
                                        onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                                        placeholder="Ex: Bebidas"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Marca</Label>
                                    <Input
                                        value={formData.marca}
                                        onChange={e => setFormData({ ...formData, marca: e.target.value })}
                                        placeholder="Ex: Coca-Cola"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Código</Label>
                                    <Input
                                        value={formData.codigo}
                                        onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Código de Barras</Label>
                                    <Input
                                        value={formData.codigo_barras}
                                        onChange={e => setFormData({ ...formData, codigo_barras: e.target.value })}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="fisc" className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Preço Compra (R$)</Label>
                                    <Input
                                        type="number" step="0.01"
                                        value={formData.preco_custo}
                                        onChange={e => setFormData({ ...formData, preco_custo: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Preço Venda (R$)</Label>
                                    <Input
                                        type="number" step="0.01"
                                        value={formData.preco_venda}
                                        onChange={e => setFormData({ ...formData, preco_venda: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Estoque Atual</Label>
                                    <Input
                                        type="number"
                                        value={formData.quantidade_atual}
                                        onChange={e => setFormData({ ...formData, quantidade_atual: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Estoque Mínimo</Label>
                                    <Input
                                        type="number"
                                        value={formData.quantidade_minima}
                                        onChange={e => setFormData({ ...formData, quantidade_minima: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Unidade</Label>
                                    <Input
                                        value={formData.unidade}
                                        onChange={e => setFormData({ ...formData, unidade: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>NCM</Label>
                                    <Input
                                        value={formData.ncm}
                                        onChange={e => setFormData({ ...formData, ncm: e.target.value })}
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="md:col-span-3 flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {productToEdit ? 'Salvar Alterações' : 'Cadastrar Produto'}
                    </Button>
                </div>
            </form>
        </DialogContent>
    );
}
