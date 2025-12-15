import { Invoice } from "@/types/invoice";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Barcode } from "lucide-react";
import { useMemo } from "react";
import { gerarBoleto, DadosBoleto, BANCOS } from "@/lib/boleto";

interface InvoiceDANFEProps {
  invoice: Invoice;
}

const statusStyles = {
  pendente: "bg-chart-4/20 text-chart-4",
  pago: "bg-primary/20 text-primary",
  vencido: "bg-destructive/20 text-destructive",
  cancelado: "bg-muted text-muted-foreground",
};

const statusLabels = {
  pendente: "Pendente",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

const modalidadeFreteLabels: Record<number, string> = {
  0: "0 - Contratação do Frete por conta do Remetente (CIF)",
  1: "1 - Contratação do Frete por conta do Destinatário (FOB)",
  2: "2 - Contratação do Frete por conta de Terceiros",
  9: "9 - Sem Ocorrência de Transporte",
};

const finalidadeLabels: Record<number, string> = {
  1: "1 - NF-e Normal",
  2: "2 - NF-e Complementar",
  3: "3 - NF-e de Ajuste",
  4: "4 - Devolução de Mercadoria",
};

export function InvoiceDANFE({ invoice }: InvoiceDANFEProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatNumber = (value: number, decimals = 2) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  // Gerar boleto real baseado nos dados da nota
  const boleto = useMemo(() => {
    // Verifica se há dados válidos para gerar boleto
    if (!invoice.numero || !invoice.totais?.valorTotalNota || invoice.totais.valorTotalNota <= 0) {
      return {
        linhaDigitavel: invoice.chaveAcesso || 'Dados insuficientes para gerar boleto',
        codigoBarras: null,
      };
    }

    const vencimento = invoice.dataSaida
      ? new Date(invoice.dataSaida)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

    const dados: DadosBoleto = {
      codigoBanco: '341', // Itaú como padrão
      moeda: '9',
      vencimento,
      valor: invoice.totais.valorTotalNota,
      nossoNumero: invoice.numero.replace(/\D/g, '').substring(0, 11) || '00000000000',
      agencia: '1234',
      conta: '1234567',
      carteira: '109',
    };

    return gerarBoleto(dados);
  }, [invoice.numero, invoice.totais?.valorTotalNota, invoice.dataSaida, invoice.chaveAcesso]);

  return (
    <Card className="border-2 border-foreground/20 shadow-lg overflow-hidden bg-card print:shadow-none">
      <CardContent className="p-0">
        {/* Header Principal - Estilo DANFE Oficial */}
        <div className="border-b-2 border-foreground/20">
          <div className="grid grid-cols-12 gap-0">
            {/* Identificação do Emitente */}
            <div className="col-span-5 border-r-2 border-foreground/20 p-3">
              <div className="text-center mb-2">
                <p className="font-bold text-lg text-foreground leading-tight">
                  {invoice.emitente.razaoSocial}
                </p>
                {invoice.emitente.nomeFantasia && (
                  <p className="text-sm text-muted-foreground">
                    {invoice.emitente.nomeFantasia}
                  </p>
                )}
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>
                  {invoice.emitente.endereco}
                  {invoice.emitente.numero && `, ${invoice.emitente.numero}`}
                  {invoice.emitente.bairro && ` - ${invoice.emitente.bairro}`}
                </p>
                <p>
                  {invoice.emitente.municipio} - {invoice.emitente.uf} - CEP:{" "}
                  {invoice.emitente.cep}
                </p>
                <p>Fone: {invoice.emitente.telefone}</p>
              </div>
            </div>

            {/* DANFE e Informações */}
            <div className="col-span-3 border-r-2 border-foreground/20">
              <div className="text-center p-2 border-b border-foreground/20">
                <h2 className="text-2xl font-bold text-foreground">DANFE</h2>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Documento Auxiliar da Nota Fiscal Eletrônica
                </p>
              </div>
              <div className="grid grid-cols-2 text-[10px]">
                <div className="border-r border-foreground/20 p-1.5 text-center">
                  <p className="text-muted-foreground">ENTRADA</p>
                  <p className="font-bold text-lg">
                    {invoice.tipoOperacao === 0 ? "X" : ""}
                  </p>
                </div>
                <div className="p-1.5 text-center">
                  <p className="text-muted-foreground">SAÍDA</p>
                  <p className="font-bold text-lg">
                    {invoice.tipoOperacao === 1 ? "X" : ""}
                  </p>
                </div>
              </div>
              <div className="border-t border-foreground/20 p-1.5 text-center">
                <p className="text-[10px] text-muted-foreground">Nº</p>
                <p className="font-bold text-foreground">{invoice.numero}</p>
              </div>
              <div className="border-t border-foreground/20 p-1.5 text-center">
                <p className="text-[10px] text-muted-foreground">SÉRIE</p>
                <p className="font-bold text-foreground">{invoice.serie}</p>
              </div>
              <div className="border-t border-foreground/20 p-1.5 text-center">
                <p className="text-[10px] text-muted-foreground">FOLHA</p>
                <p className="font-semibold text-foreground text-sm">1/1</p>
              </div>
            </div>

            {/* Código de Barras e Status */}
            <div className="col-span-4 p-3">
              <div className="flex justify-end mb-2">
                <Badge className={cn(statusStyles[invoice.status], "text-xs")}>
                  {statusLabels[invoice.status]}
                </Badge>
              </div>
              <div className="bg-muted/30 p-3 rounded flex items-center justify-center h-16 mb-2">
                <Barcode className="h-10 w-full text-foreground" />
              </div>
              <p className="font-mono text-[9px] text-center text-foreground break-all leading-tight">
                {boleto.linhaDigitavel}
              </p>
            </div>
          </div>
        </div>

        {/* Chave de Acesso e Protocolo */}
        <div className="grid grid-cols-2 border-b-2 border-foreground/20 text-[10px]">
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">CHAVE DE ACESSO</p>
            <p className="font-mono font-semibold text-foreground">
              {invoice.chaveAcesso}
            </p>
          </div>
          <div className="p-2">
            <p className="text-muted-foreground mb-0.5">
              PROTOCOLO DE AUTORIZAÇÃO DE USO
            </p>
            <p className="font-mono font-semibold text-foreground">
              {invoice.protocoloAutorizacao || "-"}{" "}
              {invoice.dataHoraAutorizacao &&
                `- ${formatDateTime(invoice.dataHoraAutorizacao)}`}
            </p>
          </div>
        </div>

        {/* Natureza da Operação */}
        <div className="grid grid-cols-4 border-b-2 border-foreground/20 text-[10px]">
          <div className="col-span-2 border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">NATUREZA DA OPERAÇÃO</p>
            <p className="font-semibold text-foreground">
              {invoice.naturezaOperacao}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">
              INSCRIÇÃO ESTADUAL
            </p>
            <p className="font-semibold text-foreground">
              {invoice.emitente.inscricaoEstadual}
            </p>
          </div>
          <div className="p-2">
            <p className="text-muted-foreground mb-0.5">
              INSCRIÇÃO ESTADUAL DO SUBST. TRIB.
            </p>
            <p className="font-semibold text-foreground">-</p>
          </div>
        </div>

        {/* CNPJ e Finalidade */}
        <div className="grid grid-cols-4 border-b-2 border-foreground/20 text-[10px]">
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">CNPJ</p>
            <p className="font-semibold text-foreground">
              {invoice.emitente.cnpj}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">
              INSCRIÇÃO MUNICIPAL
            </p>
            <p className="font-semibold text-foreground">
              {invoice.emitente.inscricaoMunicipal || "-"}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">FINALIDADE EMISSÃO</p>
            <p className="font-semibold text-foreground">
              {invoice.finalidade ? finalidadeLabels[invoice.finalidade] : "-"}
            </p>
          </div>
          <div className="p-2">
            <p className="text-muted-foreground mb-0.5">
              DATA/HORA EMISSÃO
            </p>
            <p className="font-semibold text-foreground">
              {formatDate(invoice.dataEmissao)}{" "}
              {invoice.horaEmissao || ""}
            </p>
          </div>
        </div>

        {/* Título Destinatário */}
        <div className="bg-muted/50 px-2 py-1 border-b-2 border-foreground/20">
          <p className="text-[10px] font-bold text-foreground">
            DESTINATÁRIO / REMETENTE
          </p>
        </div>

        {/* Dados do Destinatário */}
        <div className="grid grid-cols-12 border-b-2 border-foreground/20 text-[10px]">
          <div className="col-span-8 border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">NOME / RAZÃO SOCIAL</p>
            <p className="font-semibold text-foreground">
              {invoice.destinatario.razaoSocial}
            </p>
          </div>
          <div className="col-span-2 border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">CNPJ/CPF</p>
            <p className="font-semibold text-foreground">
              {invoice.destinatario.cnpj}
            </p>
          </div>
          <div className="col-span-2 p-2">
            <p className="text-muted-foreground mb-0.5">DATA SAÍDA/ENTRADA</p>
            <p className="font-semibold text-foreground">
              {formatDate(invoice.dataSaida)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 border-b-2 border-foreground/20 text-[10px]">
          <div className="col-span-6 border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">ENDEREÇO</p>
            <p className="font-semibold text-foreground">
              {invoice.destinatario.endereco}
              {invoice.destinatario.numero &&
                `, ${invoice.destinatario.numero}`}
            </p>
          </div>
          <div className="col-span-2 border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">BAIRRO / DISTRITO</p>
            <p className="font-semibold text-foreground">
              {invoice.destinatario.bairro || "-"}
            </p>
          </div>
          <div className="col-span-2 border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">CEP</p>
            <p className="font-semibold text-foreground">
              {invoice.destinatario.cep}
            </p>
          </div>
          <div className="col-span-2 p-2">
            <p className="text-muted-foreground mb-0.5">HORA SAÍDA</p>
            <p className="font-semibold text-foreground">
              {invoice.horaSaida || "-"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 border-b-2 border-foreground/20 text-[10px]">
          <div className="col-span-4 border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">MUNICÍPIO</p>
            <p className="font-semibold text-foreground">
              {invoice.destinatario.municipio}
            </p>
          </div>
          <div className="col-span-2 border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">UF</p>
            <p className="font-semibold text-foreground">
              {invoice.destinatario.uf}
            </p>
          </div>
          <div className="col-span-3 border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">FONE / FAX</p>
            <p className="font-semibold text-foreground">
              {invoice.destinatario.telefone || "-"}
            </p>
          </div>
          <div className="col-span-3 p-2">
            <p className="text-muted-foreground mb-0.5">INSCRIÇÃO ESTADUAL</p>
            <p className="font-semibold text-foreground">
              {invoice.destinatario.inscricaoEstadual}
            </p>
          </div>
        </div>

        {/* Título Fatura/Duplicatas */}
        {invoice.cobranca && (
          <>
            <div className="bg-muted/50 px-2 py-1 border-b-2 border-foreground/20">
              <p className="text-[10px] font-bold text-foreground">
                FATURA / DUPLICATAS
              </p>
            </div>
            <div className="grid grid-cols-12 border-b-2 border-foreground/20 text-[10px]">
              {invoice.cobranca.fatura && (
                <>
                  <div className="col-span-3 border-r-2 border-foreground/20 p-2">
                    <p className="text-muted-foreground mb-0.5">Nº FATURA</p>
                    <p className="font-semibold text-foreground">
                      {invoice.cobranca.fatura.numero}
                    </p>
                  </div>
                  <div className="col-span-3 border-r-2 border-foreground/20 p-2">
                    <p className="text-muted-foreground mb-0.5">VALOR ORIGINAL</p>
                    <p className="font-semibold text-foreground">
                      {formatCurrency(invoice.cobranca.fatura.valorOriginal)}
                    </p>
                  </div>
                  <div className="col-span-3 border-r-2 border-foreground/20 p-2">
                    <p className="text-muted-foreground mb-0.5">VALOR DESCONTO</p>
                    <p className="font-semibold text-foreground">
                      {formatCurrency(invoice.cobranca.fatura.valorDesconto)}
                    </p>
                  </div>
                  <div className="col-span-3 p-2">
                    <p className="text-muted-foreground mb-0.5">VALOR LÍQUIDO</p>
                    <p className="font-semibold text-foreground">
                      {formatCurrency(invoice.cobranca.fatura.valorLiquido)}
                    </p>
                  </div>
                </>
              )}
            </div>
            {invoice.cobranca.duplicatas &&
              invoice.cobranca.duplicatas.length > 0 && (
                <div className="grid grid-cols-6 border-b-2 border-foreground/20 text-[10px]">
                  {invoice.cobranca.duplicatas.map((dup, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-2",
                        idx < invoice.cobranca!.duplicatas!.length - 1 &&
                        "border-r-2 border-foreground/20"
                      )}
                    >
                      <p className="text-muted-foreground mb-0.5">
                        DUPLICATA {dup.numero}
                      </p>
                      <p className="font-semibold text-foreground">
                        Venc: {formatDate(dup.vencimento)}
                      </p>
                      <p className="font-semibold text-foreground">
                        {formatCurrency(dup.valor)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
          </>
        )}

        {/* Título Cálculo do Imposto */}
        <div className="bg-muted/50 px-2 py-1 border-b-2 border-foreground/20">
          <p className="text-[10px] font-bold text-foreground">
            CÁLCULO DO IMPOSTO
          </p>
        </div>

        {/* Impostos - Linha 1 */}
        <div className="grid grid-cols-7 border-b-2 border-foreground/20 text-[10px]">
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">BASE CÁLC. ICMS</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(invoice.totais.baseCalculoIcms)}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">VALOR ICMS</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(invoice.totais.valorIcms)}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">BASE CÁLC. ICMS ST</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(invoice.totais.baseCalculoIcmsSt)}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">VALOR ICMS ST</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(invoice.totais.valorIcmsSt)}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">V. IMP. IMPORTAÇÃO</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(0)}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">VALOR PIS</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(invoice.totais.valorPis || 0)}
            </p>
          </div>
          <div className="p-2">
            <p className="text-muted-foreground mb-0.5">VALOR TOTAL PRODUTOS</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(invoice.totais.valorTotalProdutos)}
            </p>
          </div>
        </div>

        {/* Impostos - Linha 2 */}
        <div className="grid grid-cols-7 border-b-2 border-foreground/20 text-[10px]">
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">VALOR FRETE</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(invoice.totais.valorFrete)}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">VALOR SEGURO</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(invoice.totais.valorSeguro)}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">DESCONTO</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(invoice.totais.desconto)}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">OUTRAS DESP.</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(invoice.totais.outrasDespesas)}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">VALOR IPI</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(invoice.totais.valorIpi)}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">VALOR COFINS</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(invoice.totais.valorCofins || 0)}
            </p>
          </div>
          <div className="p-2 bg-primary/5">
            <p className="text-muted-foreground mb-0.5">VALOR TOTAL DA NOTA</p>
            <p className="font-bold text-primary text-sm">
              {formatCurrency(invoice.totais.valorTotalNota)}
            </p>
          </div>
        </div>

        {/* Tributos Aproximados */}
        {invoice.totais.valorAproximadoTributos && (
          <div className="border-b-2 border-foreground/20 p-2 text-[10px] bg-chart-4/5">
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">
                VALOR APROXIMADO DOS TRIBUTOS:{" "}
              </span>
              {formatCurrency(invoice.totais.valorAproximadoTributos)} (
              {formatNumber(
                (invoice.totais.valorAproximadoTributos /
                  invoice.totais.valorTotalNota) *
                100
              )}
              %) - Conforme Lei 12.741/2012
            </p>
          </div>
        )}

        {/* Título Transportador */}
        <div className="bg-muted/50 px-2 py-1 border-b-2 border-foreground/20">
          <p className="text-[10px] font-bold text-foreground">
            TRANSPORTADOR / VOLUMES TRANSPORTADOS
          </p>
        </div>

        {/* Dados do Transporte */}
        <div className="grid grid-cols-12 border-b-2 border-foreground/20 text-[10px]">
          <div className="col-span-5 border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">RAZÃO SOCIAL</p>
            <p className="font-semibold text-foreground">
              {invoice.transporte?.transportadora?.razaoSocial || "-"}
            </p>
          </div>
          <div className="col-span-3 border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">FRETE POR CONTA</p>
            <p className="font-semibold text-foreground text-[9px]">
              {invoice.transporte
                ? modalidadeFreteLabels[invoice.transporte.modalidadeFrete]
                : "-"}
            </p>
          </div>
          <div className="col-span-2 border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">CÓDIGO ANTT</p>
            <p className="font-semibold text-foreground">
              {invoice.transporte?.veiculo?.rntc || "-"}
            </p>
          </div>
          <div className="col-span-2 p-2">
            <p className="text-muted-foreground mb-0.5">PLACA DO VEÍCULO</p>
            <p className="font-semibold text-foreground">
              {invoice.transporte?.veiculo?.placa || "-"}{" "}
              {invoice.transporte?.veiculo?.uf || ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 border-b-2 border-foreground/20 text-[10px]">
          <div className="col-span-3 border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">CNPJ / CPF</p>
            <p className="font-semibold text-foreground">
              {invoice.transporte?.transportadora?.cnpj || "-"}
            </p>
          </div>
          <div className="col-span-5 border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">ENDEREÇO</p>
            <p className="font-semibold text-foreground">
              {invoice.transporte?.transportadora?.endereco || "-"}
            </p>
          </div>
          <div className="col-span-2 border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">MUNICÍPIO</p>
            <p className="font-semibold text-foreground">
              {invoice.transporte?.transportadora?.municipio || "-"}
            </p>
          </div>
          <div className="col-span-1 border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">UF</p>
            <p className="font-semibold text-foreground">
              {invoice.transporte?.transportadora?.uf || "-"}
            </p>
          </div>
          <div className="col-span-1 p-2">
            <p className="text-muted-foreground mb-0.5">I.E.</p>
            <p className="font-semibold text-foreground">
              {invoice.transporte?.transportadora?.inscricaoEstadual || "-"}
            </p>
          </div>
        </div>

        {/* Volumes */}
        <div className="grid grid-cols-6 border-b-2 border-foreground/20 text-[10px]">
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">QUANTIDADE</p>
            <p className="font-semibold text-foreground">
              {invoice.transporte?.volumes?.quantidade || "-"}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">ESPÉCIE</p>
            <p className="font-semibold text-foreground">
              {invoice.transporte?.volumes?.especie || "-"}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">MARCA</p>
            <p className="font-semibold text-foreground">
              {invoice.transporte?.volumes?.marca || "-"}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">NUMERAÇÃO</p>
            <p className="font-semibold text-foreground">
              {invoice.transporte?.volumes?.numeracao || "-"}
            </p>
          </div>
          <div className="border-r-2 border-foreground/20 p-2">
            <p className="text-muted-foreground mb-0.5">PESO BRUTO</p>
            <p className="font-semibold text-foreground">
              {invoice.transporte?.volumes?.pesoBruto
                ? `${formatNumber(invoice.transporte.volumes.pesoBruto, 3)} Kg`
                : "-"}
            </p>
          </div>
          <div className="p-2">
            <p className="text-muted-foreground mb-0.5">PESO LÍQUIDO</p>
            <p className="font-semibold text-foreground">
              {invoice.transporte?.volumes?.pesoLiquido
                ? `${formatNumber(invoice.transporte.volumes.pesoLiquido, 3)} Kg`
                : "-"}
            </p>
          </div>
        </div>

        {/* Título Produtos */}
        <div className="bg-muted/50 px-2 py-1 border-b-2 border-foreground/20">
          <p className="text-[10px] font-bold text-foreground">
            DADOS DOS PRODUTOS / SERVIÇOS
          </p>
        </div>

        {/* Tabela de Produtos */}
        <div className="overflow-x-auto border-b-2 border-foreground/20">
          <Table>
            <TableHeader>
              <TableRow className="border-foreground/20 bg-muted/30">
                <TableHead className="text-[9px] font-bold p-1 border-r border-foreground/20">
                  CÓDIGO
                </TableHead>
                <TableHead className="text-[9px] font-bold p-1 border-r border-foreground/20 min-w-[200px]">
                  DESCRIÇÃO DO PRODUTO / SERVIÇO
                </TableHead>
                <TableHead className="text-[9px] font-bold p-1 border-r border-foreground/20">
                  NCM/SH
                </TableHead>
                <TableHead className="text-[9px] font-bold p-1 border-r border-foreground/20">
                  CST
                </TableHead>
                <TableHead className="text-[9px] font-bold p-1 border-r border-foreground/20">
                  CFOP
                </TableHead>
                <TableHead className="text-[9px] font-bold p-1 border-r border-foreground/20">
                  UN
                </TableHead>
                <TableHead className="text-[9px] font-bold p-1 border-r border-foreground/20 text-right">
                  QUANT.
                </TableHead>
                <TableHead className="text-[9px] font-bold p-1 border-r border-foreground/20 text-right">
                  V. UNIT.
                </TableHead>
                <TableHead className="text-[9px] font-bold p-1 border-r border-foreground/20 text-right">
                  V. TOTAL
                </TableHead>
                <TableHead className="text-[9px] font-bold p-1 border-r border-foreground/20 text-right">
                  B.C. ICMS
                </TableHead>
                <TableHead className="text-[9px] font-bold p-1 border-r border-foreground/20 text-right">
                  V. ICMS
                </TableHead>
                <TableHead className="text-[9px] font-bold p-1 border-r border-foreground/20 text-right">
                  V. IPI
                </TableHead>
                <TableHead className="text-[9px] font-bold p-1 text-right">
                  ALÍQ. ICMS
                </TableHead>
                <TableHead className="text-[9px] font-bold p-1 text-right">
                  ALÍQ. IPI
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.produtos.map((produto, index) => (
                <TableRow key={index} className="border-foreground/20">
                  <TableCell className="text-[9px] font-mono p-1 border-r border-foreground/20">
                    {produto.codigo}
                  </TableCell>
                  <TableCell className="text-[9px] p-1 border-r border-foreground/20">
                    {produto.descricao}
                  </TableCell>
                  <TableCell className="text-[9px] font-mono p-1 border-r border-foreground/20">
                    {produto.ncm}
                  </TableCell>
                  <TableCell className="text-[9px] font-mono p-1 border-r border-foreground/20">
                    000
                  </TableCell>
                  <TableCell className="text-[9px] font-mono p-1 border-r border-foreground/20">
                    {produto.cfop}
                  </TableCell>
                  <TableCell className="text-[9px] p-1 border-r border-foreground/20">
                    {produto.unidade}
                  </TableCell>
                  <TableCell className="text-[9px] p-1 border-r border-foreground/20 text-right">
                    {formatNumber(produto.quantidade, 4)}
                  </TableCell>
                  <TableCell className="text-[9px] p-1 border-r border-foreground/20 text-right">
                    {formatNumber(produto.valorUnitario, 4)}
                  </TableCell>
                  <TableCell className="text-[9px] p-1 border-r border-foreground/20 text-right font-medium">
                    {formatNumber(produto.valorTotal)}
                  </TableCell>
                  <TableCell className="text-[9px] p-1 border-r border-foreground/20 text-right">
                    {formatNumber(produto.bcIcms || produto.valorTotal)}
                  </TableCell>
                  <TableCell className="text-[9px] p-1 border-r border-foreground/20 text-right">
                    {formatNumber(produto.valorIcms || 0)}
                  </TableCell>
                  <TableCell className="text-[9px] p-1 border-r border-foreground/20 text-right">
                    {formatNumber(produto.valorIpi || 0)}
                  </TableCell>
                  <TableCell className="text-[9px] p-1 border-r border-foreground/20 text-right">
                    {formatNumber(produto.aliqIcms || produto.icms)}%
                  </TableCell>
                  <TableCell className="text-[9px] p-1 text-right">
                    {formatNumber(produto.aliqIpi || produto.ipi)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Título Informações Adicionais */}
        <div className="bg-muted/50 px-2 py-1 border-b-2 border-foreground/20">
          <p className="text-[10px] font-bold text-foreground">
            DADOS ADICIONAIS
          </p>
        </div>

        {/* Informações Adicionais */}
        <div className="grid grid-cols-2 text-[10px]">
          <div className="border-r-2 border-foreground/20 p-2 min-h-[80px]">
            <p className="text-muted-foreground mb-1">
              INFORMAÇÕES COMPLEMENTARES
            </p>
            <p className="text-foreground whitespace-pre-wrap">
              {invoice.informacoesAdicionais}
            </p>
          </div>
          <div className="p-2 min-h-[80px]">
            <p className="text-muted-foreground mb-1">
              RESERVADO AO FISCO
            </p>
            <p className="text-foreground whitespace-pre-wrap">
              {invoice.informacoesFisco || ""}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
