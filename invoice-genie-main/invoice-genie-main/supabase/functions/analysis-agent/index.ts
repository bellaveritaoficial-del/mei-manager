import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const MODEL = 'deepseek/deepseek-v3.2-speciale';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const {
            inventoryData,
            financialData,
            invoiceData,
            meiLimit = 81000
        } = await req.json();

        const systemPrompt = `Você é um analista de negócios especializado em microempresas e MEI no Brasil.
Sua função é gerar um RELATÓRIO COMPLETO E DETALHADO analisando todos os aspectos do negócio.

O relatório deve conter:

## 📊 1. SAÚDE FINANCEIRA MEI
- Faturamento vs limite R$81.000
- Projeção para fim do ano
- Risco de ultrapassar limite

## 🔍 2. GARGALOS FINANCEIROS
- Despesas mais altas
- Produtos com baixa margem
- Pagamentos atrasados ou pendentes

## 📦 3. CONTROLE DE ESTOQUE
- Produtos parados (sem giro)
- Sugestões de reposição
- Previsão de demanda

## 💰 4. CONTROLE DE GASTOS
- Categorias de maior gasto
- Tendências de despesas
- Oportunidades de economia

## 💡 5. DICAS DE MELHORIA
- Como otimizar operações
- Melhores práticas
- Ações prioritárias

## 📄 6. ANÁLISE DE NOTAS FISCAIS
- Padrões de compra/venda
- Sazonalidade
- Fornecedores/clientes frequentes

Use emojis e formatação clara. Seja específico e acionável.
Se o limite MEI estiver acima de 85%, destaque com 🚨 ALERTA CRÍTICO.`;

        const userPrompt = `Gere um relatório completo com base nos seguintes dados:

=== DADOS DE ESTOQUE ===
${inventoryData ? `
- Total de Produtos: ${inventoryData.totalProducts || 0}
- Valor em Estoque: R$ ${inventoryData.totalValue?.toFixed(2) || '0,00'}
- Produtos com Estoque Baixo: ${inventoryData.lowStockCount || 0}
` : 'Dados de estoque não disponíveis'}

=== DADOS FINANCEIROS ===
${financialData ? `
- Receitas (Vendas): R$ ${financialData.totalReceitas?.toFixed(2) || '0,00'}
- Despesas (Compras): R$ ${financialData.totalDespesas?.toFixed(2) || '0,00'}
- Saldo: R$ ${financialData.saldo?.toFixed(2) || '0,00'}
- Notas Pendentes: ${financialData.notasPendentes || 0}
- Notas Pagas: ${financialData.notasPagas || 0}
- Notas Vencidas: ${financialData.notasVencidas || 0}
- Limite MEI: R$ ${meiLimit.toFixed(2)}
- Percentual Utilizado: ${((financialData.totalReceitas || 0) / meiLimit * 100).toFixed(1)}%
` : 'Dados financeiros não disponíveis'}

=== DADOS DE NOTAS FISCAIS ===
${invoiceData ? `
- Total de Notas: ${invoiceData.totalInvoices || 0}
- Última Nota: ${invoiceData.lastInvoiceDate || 'N/A'}
` : 'Dados de notas não disponíveis'}

Gere um relatório COMPLETO e DETALHADO com recomendações específicas.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://nf-control.app',
                'X-Title': 'NF Control - Analysis Agent',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 4000,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter error:', errorText);
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        const analysis = data.choices?.[0]?.message?.content || 'Análise não disponível';

        // Calculate alert level for MEI
        const percentUsed = financialData ? ((financialData.totalReceitas || 0) / meiLimit) * 100 : 0;
        let alertLevel = 'normal';
        if (percentUsed > 95) alertLevel = 'bloqueio';
        else if (percentUsed > 85) alertLevel = 'critico';
        else if (percentUsed > 70) alertLevel = 'alerta';
        else if (percentUsed > 50) alertLevel = 'atencao';

        return new Response(
            JSON.stringify({
                analysis,
                alertLevel,
                percentUsed: percentUsed.toFixed(1),
                model: MODEL,
                timestamp: new Date().toISOString(),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Error in analysis-agent:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
