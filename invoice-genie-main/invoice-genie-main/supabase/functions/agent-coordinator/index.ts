import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const MODEL = 'deepseek/deepseek-r1:free'; // DeepSeek R1 for orchestration

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentTask {
    agent: 'inventory' | 'finance' | 'analysis' | 'ocr';
    priority: 'low' | 'medium' | 'high' | 'critical';
    data: any;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { action, data } = await req.json();

        if (action === 'analyze_situation') {
            // Orchestrator analyzes the current situation and decides what agents to invoke
            const systemPrompt = `Você é o orquestrador central de um sistema multi-agentes para gestão de MEI.
Você coordena 4 agentes especializados:
1. OCR Agent - Extrai dados de notas fiscais
2. Inventory Agent - Monitora estoque
3. Finance Agent - Analisa financeiro e limite MEI
4. Analysis Agent - Gera relatórios completos

Sua função é:
- Analisar a situação atual do negócio
- Identificar o que precisa de atenção imediata
- Priorizar alertas (critical > high > medium > low)
- Decidir quais agentes precisam ser acionados

Responda em JSON com a seguinte estrutura:
{
  "summary": "Resumo da situação",
  "alerts": [{"level": "critical|high|medium|low", "message": "..."}],
  "recommendations": ["..."],
  "agentsToInvoke": ["inventory", "finance", "analysis"]
}`;

            const userPrompt = `Analise estes dados e decida o que fazer:

MEI Status:
- Faturamento: R$ ${data.financialData?.totalReceitas?.toFixed(2) || '0,00'}
- Limite: R$ 81.000,00
- Percentual: ${((data.financialData?.totalReceitas || 0) / 81000 * 100).toFixed(1)}%

Estoque:
- Produtos: ${data.inventoryData?.totalProducts || 0}
- Estoque Baixo: ${data.inventoryData?.lowStockCount || 0}
- Valor: R$ ${data.inventoryData?.totalValue?.toFixed(2) || '0,00'}

Notas:
- Pendentes: ${data.financialData?.notasPendentes || 0}
- Vencidas: ${data.financialData?.notasVencidas || 0}

Determine a prioridade de cada área e quais agentes devem ser acionados.`;

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://nf-control.app',
                    'X-Title': 'NF Control - Agent Coordinator',
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 1500,
                }),
            });

            if (!response.ok) {
                throw new Error(`OpenRouter API error: ${response.status}`);
            }

            const result = await response.json();
            let content = result.choices?.[0]?.message?.content || '{}';

            // Try to parse JSON from response
            try {
                // Extract JSON from markdown code blocks if present
                const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    content = jsonMatch[1] || jsonMatch[0];
                }
                const decision = JSON.parse(content);
                return new Response(
                    JSON.stringify({
                        decision,
                        model: MODEL,
                        timestamp: new Date().toISOString(),
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            } catch {
                // If can't parse JSON, return raw content
                return new Response(
                    JSON.stringify({
                        decision: { summary: content, alerts: [], recommendations: [], agentsToInvoke: [] },
                        model: MODEL,
                        timestamp: new Date().toISOString(),
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        return new Response(
            JSON.stringify({ error: 'Unknown action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Error in agent-coordinator:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
