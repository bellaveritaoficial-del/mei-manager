import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useInvoices } from "@/hooks/useInvoices";
import { InvoiceCaptureModal } from "@/components/invoice/InvoiceCaptureModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Search,
  Filter,
  Plus,
  Loader2,
  Eye,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const InvoiceList = () => {
  const navigate = useNavigate();
  const { invoices, isLoading, deleteInvoice } = useInvoices();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "pago":
        return <Badge className="bg-green-500/20 text-green-500">Pago</Badge>;
      case "pendente":
        return <Badge className="bg-yellow-500/20 text-yellow-500">Pendente</Badge>;
      case "vencido":
        return <Badge className="bg-red-500/20 text-red-500">Vencido</Badge>;
      case "cancelado":
        return <Badge className="bg-gray-500/20 text-gray-500">Cancelado</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta nota?")) return;
    try {
      await deleteInvoice.mutateAsync(id);
      toast.success("Nota excluída com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir nota");
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.numero.toLowerCase().includes(search.toLowerCase()) ||
      invoice.dest_razao_social?.toLowerCase().includes(search.toLowerCase()) ||
      invoice.chave_acesso?.includes(search);

    const matchesStatus =
      statusFilter === "all" || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
      <div className="space-y-6 pt-12 md:pt-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notas Fiscais</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas notas fiscais eletrônicas
            </p>
          </div>
          <Button onClick={() => setIsCaptureModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Nota
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, destinatário ou chave..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Lista de Notas ({filteredInvoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Nenhuma nota encontrada</p>
                <p className="text-sm">
                  {invoices.length === 0
                    ? "Capture sua primeira nota fiscal"
                    : "Tente ajustar os filtros de busca"}
                </p>
                {invoices.length === 0 && (
                  <Button
                    className="mt-4"
                    onClick={() => setIsCaptureModalOpen(true)}
                  >
                    Capturar Nota
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Data Emissão</TableHead>
                      <TableHead>Destinatário</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/notas/${invoice.id}`)}
                      >
                        <TableCell className="font-mono font-medium">
                          {invoice.numero}
                        </TableCell>
                        <TableCell>{formatDate(invoice.data_emissao)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {invoice.dest_razao_social || "Não informado"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(invoice.valor_total_nota)}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/notas/${invoice.id}`);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(invoice.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <InvoiceCaptureModal
        open={isCaptureModalOpen}
        onOpenChange={setIsCaptureModalOpen}
      />
    </MainLayout>
  );
};

export default InvoiceList;
