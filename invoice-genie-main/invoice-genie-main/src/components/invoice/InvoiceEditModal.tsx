import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { InvoiceWithItems } from "@/hooks/useInvoices";

interface InvoiceEditModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoice: InvoiceWithItems | null;
    onSave: (data: Partial<InvoiceWithItems>) => Promise<void>;
}

export function InvoiceEditModal({
    open,
    onOpenChange,
    invoice,
    onSave,
}: InvoiceEditModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        numero: "",
        serie: "",
        natureza_operacao: "",
        data_emissao: "",
        dest_razao_social: "",
        dest_cnpj: "",
        dest_endereco: "",
        dest_municipio: "",
        dest_uf: "",
        dest_cep: "",
        valor_total_nota: 0,
        status: "pendente" as "pendente" | "pago" | "vencido" | "cancelado",
        informacoes_adicionais: "",
    });

    useEffect(() => {
        if (invoice) {
            setFormData({
                numero: invoice.numero || "",
                serie: invoice.serie || "",
                natureza_operacao: invoice.natureza_operacao || "",
                data_emissao: invoice.data_emissao || "",
                dest_razao_social: invoice.dest_razao_social || "",
                dest_cnpj: invoice.dest_cnpj || "",
                dest_endereco: invoice.dest_endereco || "",
                dest_municipio: invoice.dest_municipio || "",
                dest_uf: invoice.dest_uf || "",
                dest_cep: invoice.dest_cep || "",
                valor_total_nota: invoice.valor_total_nota || 0,
                status: (invoice.status as "pendente" | "pago" | "vencido" | "cancelado") || "pendente",
                informacoes_adicionais: invoice.informacoes_adicionais || "",
            });
        }
    }, [invoice]);

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            await onSave(formData);
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving invoice:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Nota Fiscal</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Número</Label>
                            <Input
                                value={formData.numero}
                                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Série</Label>
                            <Input
                                value={formData.serie}
                                onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Data Emissão</Label>
                            <Input
                                type="date"
                                value={formData.data_emissao}
                                onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value: "pendente" | "pago" | "vencido" | "cancelado") =>
                                    setFormData({ ...formData, status: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="pago">Pago</SelectItem>
                                    <SelectItem value="vencido">Vencido</SelectItem>
                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Natureza da Operação</Label>
                        <Input
                            value={formData.natureza_operacao}
                            onChange={(e) => setFormData({ ...formData, natureza_operacao: e.target.value })}
                        />
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Destinatário</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Razão Social</Label>
                                <Input
                                    value={formData.dest_razao_social}
                                    onChange={(e) => setFormData({ ...formData, dest_razao_social: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>CNPJ/CPF</Label>
                                <Input
                                    value={formData.dest_cnpj}
                                    onChange={(e) => setFormData({ ...formData, dest_cnpj: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <div className="space-y-2">
                                <Label>Município</Label>
                                <Input
                                    value={formData.dest_municipio}
                                    onChange={(e) => setFormData({ ...formData, dest_municipio: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>UF</Label>
                                <Input
                                    value={formData.dest_uf}
                                    maxLength={2}
                                    onChange={(e) => setFormData({ ...formData, dest_uf: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>CEP</Label>
                                <Input
                                    value={formData.dest_cep}
                                    onChange={(e) => setFormData({ ...formData, dest_cep: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <div className="space-y-2">
                            <Label>Valor Total da Nota</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.valor_total_nota}
                                onChange={(e) => setFormData({ ...formData, valor_total_nota: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Informações Adicionais</Label>
                        <Textarea
                            value={formData.informacoes_adicionais}
                            onChange={(e) => setFormData({ ...formData, informacoes_adicionais: e.target.value })}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            "Salvar Alterações"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
