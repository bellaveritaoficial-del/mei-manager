/**
 * Funções para gerar e validar códigos de boleto bancário brasileiro
 */

// Calcula dígito verificador módulo 10
function modulo10(bloco: string): number {
    let soma = 0;
    let peso = 2;

    for (let i = bloco.length - 1; i >= 0; i--) {
        let resultado = parseInt(bloco[i]) * peso;
        if (resultado > 9) {
            resultado = Math.floor(resultado / 10) + (resultado % 10);
        }
        soma += resultado;
        peso = peso === 2 ? 1 : 2;
    }

    const resto = soma % 10;
    return resto === 0 ? 0 : 10 - resto;
}

// Calcula dígito verificador módulo 11
function modulo11(codigo: string): number {
    let soma = 0;
    let peso = 2;

    for (let i = codigo.length - 1; i >= 0; i--) {
        soma += parseInt(codigo[i]) * peso;
        peso = peso < 9 ? peso + 1 : 2;
    }

    const resto = soma % 11;
    if (resto === 0 || resto === 1 || resto === 10) {
        return 1;
    }
    return 11 - resto;
}

// Calcula fator de vencimento a partir de uma data
function calcularFatorVencimento(dataVencimento: Date): string {
    const dataBase = new Date(1997, 9, 7); // Data base do boleto
    const diffTime = dataVencimento.getTime() - dataBase.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return String(diffDays).padStart(4, '0');
}

// Formata valor para o boleto (10 dígitos, sem vírgula)
function formatarValor(valor: number): string {
    const valorCentavos = Math.round(valor * 100);
    return String(valorCentavos).padStart(10, '0');
}

export interface DadosBoleto {
    codigoBanco: string;        // 3 dígitos (ex: 001 = BB, 341 = Itaú, 033 = Santander)
    moeda: string;              // normalmente "9" para Real
    vencimento: Date;
    valor: number;
    nossoNumero: string;        // Número do documento
    agencia: string;            // 4 dígitos
    conta: string;              // Conta do beneficiário
    carteira: string;           // Carteira de cobrança
}

/**
 * Gera código de barras de 44 dígitos para boleto bancário
 */
export function gerarCodigoBarras(dados: DadosBoleto): string {
    const banco = dados.codigoBanco.padStart(3, '0');
    const moeda = dados.moeda || '9';
    const fatorVencimento = calcularFatorVencimento(dados.vencimento);
    const valor = formatarValor(dados.valor);

    // Campo livre (25 dígitos) - formato simplificado
    const nossoNumero = dados.nossoNumero.padStart(11, '0');
    const agencia = dados.agencia.padStart(4, '0');
    const conta = dados.conta.padStart(7, '0');
    const carteira = dados.carteira.padStart(3, '0');

    const campoLivre = `${agencia}${carteira}${nossoNumero}${conta}`;

    // Código sem DV geral
    const codigoSemDV = `${banco}${moeda}${fatorVencimento}${valor}${campoLivre}`;

    // Calcula DV geral (posição 5)
    const dvGeral = modulo11(codigoSemDV);

    // Código completo de 44 dígitos
    return `${banco}${moeda}${dvGeral}${fatorVencimento}${valor}${campoLivre}`;
}

/**
 * Converte código de barras para linha digitável (47 dígitos com DV de cada campo)
 */
export function gerarLinhaDigitavel(codigoBarras: string): string {
    const codigo = codigoBarras.replace(/\D/g, '');

    if (codigo.length !== 44) {
        throw new Error('Código de barras deve ter 44 dígitos');
    }

    // Campo 1: posições 1-4 e 20-24 do código de barras + DV
    const campo1 = codigo.substring(0, 4) + codigo.substring(19, 24);
    const dv1 = modulo10(campo1);

    // Campo 2: posições 25-34 do código de barras + DV
    const campo2 = codigo.substring(24, 34);
    const dv2 = modulo10(campo2);

    // Campo 3: posições 35-44 do código de barras + DV
    const campo3 = codigo.substring(34, 44);
    const dv3 = modulo10(campo3);

    // Campo 4: DV geral (posição 5 do código de barras)
    const campo4 = codigo.substring(4, 5);

    // Campo 5: posições 6-19 do código de barras (vencimento + valor)
    const campo5 = codigo.substring(5, 19);

    // Formata linha digitável
    const bloco1 = `${campo1.substring(0, 5)}.${campo1.substring(5)}${dv1}`;
    const bloco2 = `${campo2.substring(0, 5)}.${campo2.substring(5)}${dv2}`;
    const bloco3 = `${campo3.substring(0, 5)}.${campo3.substring(5)}${dv3}`;

    return `${bloco1} ${bloco2} ${bloco3} ${campo4} ${campo5}`;
}

/**
 * Gera boleto completo com código de barras e linha digitável
 */
export function gerarBoleto(dados: DadosBoleto) {
    try {
        // Validar dados obrigatórios
        if (!dados.valor || dados.valor <= 0) {
            return {
                codigoBarras: null,
                linhaDigitavel: 'Valor inválido',
                banco: dados.codigoBanco,
                vencimento: dados.vencimento,
                valor: dados.valor,
                erro: 'Valor do boleto deve ser maior que zero',
            };
        }

        const codigoBarras = gerarCodigoBarras(dados);
        const linhaDigitavel = gerarLinhaDigitavel(codigoBarras);

        return {
            codigoBarras,
            linhaDigitavel,
            banco: dados.codigoBanco,
            vencimento: dados.vencimento,
            valor: dados.valor,
        };
    } catch (error) {
        console.error('[Boleto] Erro ao gerar boleto:', error);
        return {
            codigoBarras: null,
            linhaDigitavel: 'Erro ao gerar código',
            banco: dados.codigoBanco,
            vencimento: dados.vencimento,
            valor: dados.valor,
            erro: error instanceof Error ? error.message : 'Erro desconhecido',
        };
    }
}

/**
 * Gera um boleto aleatório para testes/demonstração
 */
export function gerarBoletoAleatorio(valor?: number, vencimento?: Date) {
    const bancos = ['001', '033', '104', '237', '341', '422'];
    const banco = bancos[Math.floor(Math.random() * bancos.length)];

    const dados: DadosBoleto = {
        codigoBanco: banco,
        moeda: '9',
        vencimento: vencimento || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
        valor: valor || Math.random() * 5000 + 100,
        nossoNumero: String(Math.floor(Math.random() * 99999999999)).padStart(11, '0'),
        agencia: String(Math.floor(Math.random() * 9999)).padStart(4, '0'),
        conta: String(Math.floor(Math.random() * 9999999)).padStart(7, '0'),
        carteira: String(Math.floor(Math.random() * 99)).padStart(2, '0'),
    };

    return gerarBoleto(dados);
}

/**
 * Valida se uma linha digitável tem formato válido
 */
export function validarLinhaDigitavel(linha: string): boolean {
    const numeros = linha.replace(/\D/g, '');
    return numeros.length === 47;
}

/**
 * Formata linha digitável para exibição
 */
export function formatarLinhaDigitavel(linha: string): string {
    const numeros = linha.replace(/\D/g, '');
    if (numeros.length !== 47) return linha;

    return `${numeros.substring(0, 5)}.${numeros.substring(5, 10)} ${numeros.substring(10, 15)}.${numeros.substring(15, 21)} ${numeros.substring(21, 26)}.${numeros.substring(26, 32)} ${numeros.substring(32, 33)} ${numeros.substring(33)}`;
}

// Códigos de bancos comuns
export const BANCOS = {
    '001': 'Banco do Brasil',
    '033': 'Santander',
    '104': 'Caixa Econômica',
    '237': 'Bradesco',
    '341': 'Itaú',
    '422': 'Safra',
    '756': 'Sicoob',
} as const;
