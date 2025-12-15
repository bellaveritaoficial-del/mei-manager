import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const MODEL = 'deepseek/deepseek-v3.2-speciale';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Validate API key first
        if (!OPENROUTER_API_KEY) {
            console.error('OPENROUTER_API_KEY is not configured');
            return new Response(
                JSON.stringify({
                    error: 'API key not configured. Please set OPENROUTER_API_KEY secret in Supabase.',
                    analysis: '⚠️ **Agente não configurado**\n\nPara ativar a análise inteligente, configure o secret `OPENROUTER_API_KEY` no Supabase.\n\n1. Acesse o painel do Supabase\n2. Vá em Edge Functions > Secrets\n3. Adicione a chave OPENROUTER_API_KEY com seu token do OpenRouter'
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { inventoryData } = await req.json();

        if (!inventoryData) {
            return new Response(
                JSON.stringify({ error: 'inventoryData is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const systemPrompt = `Você é um especialista em gestão de estoque para Microempreendedores Individuais (MEI) no Brasil.
Analise os dados de estoque fornecidos e forneça insights acionáveis.

Sua análise deve incluir:
1. **Resumo Executivo** - Visão geral da saúde do estoque
2. **Alertas Críticos** - Produtos que precisam de atenção imediata
3. **Sugestões de Reposição** - O que precisa ser reposto e em que quantidade
4. **Produtos Parados** - Itens sem giro que podem estar ocupando capital
5. **Previsão de Demanda** - Baseado nos dados disponíveis
6. **Dicas de Otimização** - Como melhorar a gestão do estoque

Use emojis para facilitar a leitura. Seja conciso mas completo.
Responda em português brasileiro.`;

        const userPrompt = `Analise estes dados de estoque:

Total de Produtos: ${inventoryData.totalProducts}
Valor Total em Estoque: R$ ${inventoryData.totalValue?.toFixed(2) || '0,00'}
Produtos com Estoque Baixo: ${inventoryData.lowStockCount}

Produtos com Estoque Baixo:
${inventoryData.lowStockProducts?.map((p: any) =>
            `- ${p.descricao}: ${p.quantidade_atual}/${p.quantidade_minima} unidades`
        ).join('\n') || 'Nenhum'}

Top 5 Produtos por Valor:
${inventoryData.topProducts?.map((p: any) =>
            `- ${p.name}: R$ ${p.valor?.toFixed(2) || '0,00'}`
        ).join('\n') || 'Nenhum'}

Categorias:
${inventoryData.categories?.map((c: any) =>
            `- ${c.name}: ${c.count} produtos, ${c.value} unidades`
        ).join('\n') || 'Nenhum'}

Forneça uma análise completa e ações recomendadas.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://nf-control.app',
                'X-Title': 'NF Control - Inventory Agent',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2000,
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
                model: MODEL,
                timestamp: new Date().toISOString(),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Error in inventory-agent:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
