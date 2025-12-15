import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const MODEL = 'qwen/qwen3-235b-a22b:free';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { financialData, meiLimit = 81000 } = await req.json();

        if (!financialData) {
            return new Response(
                JSON.stringify({ error: 'financialData is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const percentUsed = ((financialData.totalReceitas || 0) / meiLimit) * 100;
        let alertLevel = 'normal';
        if (percentUsed > 95) alertLevel = 'bloqueio';
        else if (percentUsed > 85) alertLevel = 'critico';
        else if (percentUsed > 70) alertLevel = 'alerta';
        else if (percentUsed > 50) alertLevel = 'atencao';

        const systemPrompt = `Você é um consultor financeiro especializado em MEI (Microempreendedor Individual) no Brasil.
O limite anual de faturamento do MEI é de R$ 81.000,00.

Sua análise deve incluir:
1. **Status do Limite MEI** - Faturamento atual vs limite, com alertas visuais
2. **Projeção Anual** - Se mantiver o ritmo atual, vai ultrapassar?
3. **Gargalos Financeiros** - Despesas recorrentes, custos altos
4. **Fluxo de Caixa** - Análise de entradas vs saídas
5. **Dicas de Controle de Gastos** - Como economizar
6. **Recomendações** - Ações para melhorar a saúde financeira

IMPORTANTE: Se o limite MEI estiver acima de 85%, use 🚨 ALERTA CRÍTICO no início.
Se estiver acima de 95%, use ⛔ BLOQUEIO IMINENTE.

Responda em português brasileiro com emojis para facilitar leitura.`;

        const userPrompt = `Analise estes dados financeiros de um MEI:

📊 RESUMO FINANCEIRO:
- Receitas (Vendas): R$ ${financialData.totalReceitas?.toFixed(2) || '0,00'}
- Despesas (Compras): R$ ${financialData.totalDespesas?.toFixed(2) || '0,00'}
- Saldo: R$ ${financialData.saldo?.toFixed(2) || '0,00'}

📋 STATUS DAS NOTAS:
- Pendentes: ${financialData.notasPendentes || 0}
- Pagas: ${financialData.notasPagas || 0}
- Vencidas: ${financialData.notasVencidas || 0}

💰 LIMITE MEI:
- Limite Anual: R$ ${meiLimit.toFixed(2)}
- Faturamento Atual: R$ ${financialData.totalReceitas?.toFixed(2) || '0,00'}
- Percentual Utilizado: ${percentUsed.toFixed(1)}%
- Nível de Alerta: ${alertLevel.toUpperCase()}

Forneça uma análise completa com foco no controle do limite MEI.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://nf-control.app',
                'X-Title': 'NF Control - Finance Agent',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2500,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter error:', errorText);
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        const analysis = data.choices?.[0]?.message?.content || 'Análise não disponível';

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
        console.error('Error in finance-agent:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
