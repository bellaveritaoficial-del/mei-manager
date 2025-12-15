export interface InvoiceEmitter {
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal?: string;
  endereco: string;
  numero?: string;
  bairro?: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  email?: string;
}

export interface InvoiceRecipient {
  razaoSocial: string;
  cnpj: string;
  inscricaoEstadual: string;
  endereco: string;
  numero?: string;
  bairro?: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone?: string;
  email?: string;
}

export interface InvoiceProduct {
  codigo: string;
  descricao: string;
  ncm: string;
  cest?: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  valorDesconto?: number;
  bcIcms?: number;
  valorIcms?: number;
  aliqIcms?: number;
  valorIpi?: number;
  aliqIpi?: number;
  icms: number;
  ipi: number;
}

export interface InvoiceTotals {
  baseCalculoIcms: number;
  valorIcms: number;
  baseCalculoIcmsSt: number;
  valorIcmsSt: number;
  valorTotalProdutos: number;
  valorFrete: number;
  valorSeguro: number;
  desconto: number;
  outrasDespesas: number;
  valorIpi: number;
  valorPis?: number;
  valorCofins?: number;
  valorAproximadoTributos?: number;
  valorTotalNota: number;
}

export interface InvoiceTransport {
  modalidadeFrete: 0 | 1 | 2 | 9; // 0=Emitente, 1=Destinatário, 2=Terceiros, 9=Sem frete
  transportadora?: {
    razaoSocial: string;
    cnpj: string;
    inscricaoEstadual?: string;
    endereco?: string;
    municipio?: string;
    uf?: string;
  };
  veiculo?: {
    placa: string;
    uf: string;
    rntc?: string;
  };
  volumes?: {
    quantidade: number;
    especie: string;
    marca?: string;
    numeracao?: string;
    pesoLiquido: number;
    pesoBruto: number;
  };
}

export interface InvoiceBilling {
  fatura?: {
    numero: string;
    valorOriginal: number;
    valorDesconto: number;
    valorLiquido: number;
  };
  duplicatas?: Array<{
    numero: string;
    vencimento: string;
    valor: number;
  }>;
  formaPagamento?: string;
}

export interface Invoice {
  id: string;
  numero: string;
  serie: string;
  chaveAcesso: string;
  protocoloAutorizacao?: string;
  dataHoraAutorizacao?: string;
  naturezaOperacao: string;
  tipoOperacao?: 0 | 1; // 0=Entrada, 1=Saída
  finalidade?: 1 | 2 | 3 | 4; // 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
  consumidorFinal?: 0 | 1; // 0=Não, 1=Sim
  presencaComprador?: 0 | 1 | 2 | 3 | 4 | 9;
  dataEmissao: string;
  horaEmissao?: string;
  dataSaida: string;
  horaSaida?: string;
  emitente: InvoiceEmitter;
  destinatario: InvoiceRecipient;
  produtos: InvoiceProduct[];
  totais: InvoiceTotals;
  transporte?: InvoiceTransport;
  cobranca?: InvoiceBilling;
  informacoesAdicionais: string;
  informacoesFisco?: string;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  imageUrl?: string;
}

export interface FinancialSummary {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  notasPendentes: number;
  notasPagas: number;
  notasVencidas: number;
}
