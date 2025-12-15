import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { InvoiceDANFE } from "@/components/invoice/InvoiceDANFE";
import { useInvoices, InvoiceWithItems } from "@/hooks/useInvoices";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer, Edit, Loader2, Trash2 } from "lucide-react";
import { Invoice } from "@/types/invoice";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { InvoiceEditModal } from "@/components/invoice/InvoiceEditModal";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getInvoice, deleteInvoice, updateInvoice } = useInvoices();
  const { company } = useCompany();
  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const danfeRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!id) return;
      try {
        const data = await getInvoice(id);
        setInvoice(data);
      } catch (error) {
        console.error("Error loading invoice:", error);
      } finally {
        setLoading(false);
      }
    };
    loadInvoice();
  }, [id]);

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Export as PNG
  const handleExportPNG = async () => {
    if (!danfeRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(danfeRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `NF-${invoice?.numero || 'export'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Nota exportada como PNG!');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erro ao exportar nota');
    }
  };

  // Export as PDF
  const handleExportPDF = async () => {
    if (!danfeRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(danfeRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`NF-${invoice?.numero || 'export'}.pdf`);
      toast.success('Nota exportada como PDF!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteInvoice.mutateAsync(id);
      toast.success('Nota excluída com sucesso!');
      navigate('/notas');
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Erro ao excluir nota');
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  // Save edit handler
  const handleSaveEdit = async (data: Partial<InvoiceWithItems>) => {
    if (!id) return;
    try {
      await updateInvoice.mutateAsync({ id, ...data });
      const updated = await getInvoice(id);
      setInvoice(updated);
      toast.success('Nota atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Erro ao atualizar nota');
      throw error;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!invoice) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Nota não encontrada
          </h2>
          <p className="text-muted-foreground mb-4">
            A nota fiscal solicitada não existe.
          </p>
          <Button onClick={() => navigate("/notas")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para lista
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Transform to Invoice type for InvoiceDANFE component
  const transformedInvoice: Invoice = {
    id: invoice.id,
    numero: invoice.numero,
    serie: invoice.serie || "001",
    chaveAcesso: invoice.chave_acesso || "",
    protocoloAutorizacao: invoice.protocolo_autorizacao || undefined,
    dataHoraAutorizacao: invoice.data_hora_autorizacao || undefined,
    naturezaOperacao: invoice.natureza_operacao || "",
    tipoOperacao: invoice.tipo_operacao as 0 | 1 | undefined,
    finalidade: invoice.finalidade as 1 | 2 | 3 | 4 | undefined,
    dataEmissao: invoice.data_emissao,
    horaEmissao: invoice.hora_emissao || undefined,
    dataSaida: invoice.data_saida || invoice.data_emissao,
    horaSaida: invoice.hora_saida || undefined,
    emitente: {
      razaoSocial: company?.razao_social || "",
      nomeFantasia: company?.nome_fantasia || "",
      cnpj: company?.cnpj || "",
      inscricaoEstadual: company?.inscricao_estadual || "",
      inscricaoMunicipal: company?.inscricao_municipal || "",
      endereco: company?.endereco || "",
      numero: company?.numero || "",
      bairro: company?.bairro || "",
      municipio: company?.municipio || "",
      uf: company?.uf || "",
      cep: company?.cep || "",
      telefone: company?.telefone || "",
      email: company?.email || "",
    },
    destinatario: {
      razaoSocial: invoice.dest_razao_social || "",
      cnpj: invoice.dest_cnpj || "",
      inscricaoEstadual: invoice.dest_inscricao_estadual || "",
      endereco: invoice.dest_endereco || "",
      municipio: invoice.dest_municipio || "",
      uf: invoice.dest_uf || "",
      cep: invoice.dest_cep || "",
      telefone: invoice.dest_telefone || "",
      email: invoice.dest_email || "",
    },
    produtos:
      invoice.invoice_items?.map((item) => ({
        codigo: item.codigo || "",
        descricao: item.descricao,
        ncm: item.ncm || "",
        cest: item.cest || "",
        cfop: item.cfop || "",
        unidade: item.unidade || "UN",
        quantidade: item.quantidade,
        valorUnitario: item.valor_unitario,
        valorTotal: item.valor_total,
        valorDesconto: item.valor_desconto || 0,
        bcIcms: item.bc_icms || 0,
        valorIcms: item.valor_icms || 0,
        aliqIcms: item.aliq_icms || 0,
        valorIpi: item.valor_ipi || 0,
        aliqIpi: item.aliq_ipi || 0,
        icms: item.aliq_icms || 0,
        ipi: item.aliq_ipi || 0,
      })) || [],
    totais: {
      baseCalculoIcms: invoice.base_calculo_icms || 0,
      valorIcms: invoice.valor_icms || 0,
      baseCalculoIcmsSt: 0,
      valorIcmsSt: 0,
      valorTotalProdutos: invoice.valor_total_produtos || 0,
      valorFrete: invoice.valor_frete || 0,
      valorSeguro: invoice.valor_seguro || 0,
      desconto: invoice.desconto || 0,
      outrasDespesas: 0,
      valorIpi: invoice.valor_ipi || 0,
      valorPis: invoice.valor_pis || 0,
      valorCofins: invoice.valor_cofins || 0,
      valorTotalNota: invoice.valor_total_nota,
    },
    informacoesAdicionais: invoice.informacoes_adicionais || "",
    informacoesFisco: invoice.informacoes_fisco || "",
    status: invoice.status as "pendente" | "pago" | "vencido" | "cancelado",
    imageUrl: invoice.image_url || undefined,
  };

  return (
    <MainLayout>
      <div className="space-y-6 pt-12 md:pt-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                NF-e {invoice.numero}
              </h1>
              <p className="text-muted-foreground">
                {invoice.natureza_operacao}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportPDF}>
                  Exportar como PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPNG}>
                  Exportar como PNG
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => setEditModalOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteModalOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>

        {/* DANFE */}
        <div ref={danfeRef}>
          <InvoiceDANFE invoice={transformedInvoice} />
        </div>
      </div>

      {/* Modals */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDelete}
        title="Excluir Nota Fiscal"
        description={`Tem certeza que deseja excluir a nota ${invoice.numero}? Esta ação não pode ser desfeita.`}
        isLoading={isDeleting}
      />

      <InvoiceEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        invoice={invoice}
        onSave={handleSaveEdit}
      />
    </MainLayout>
  );
};

export default InvoiceDetail;
