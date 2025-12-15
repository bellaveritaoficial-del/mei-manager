// @ts-nocheck - Deno types handled by Supabase Edge Runtime
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
// Amazon Nova 2 Lite - Vision model for product image analysis
const MODEL = 'amazon/nova-2-lite-v1:free';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { image } = await req.json(); // Expecting base64 string (without data:image/... prefix ideally, or handle it)

        if (!image) {
            throw new Error("No image provided");
        }

        // Log image size for debugging
        console.log("Image received, length:", image.length);

        const systemPrompt = `Você é um assistente de cadastro de produtos especialista para estoque de pequenos negócios.
Analise a imagem fornecida e extraia TODAS as informações visíveis para cadastro.

IMPORTANTE:
- A QUANTIDADE de produtos geralmente está escrita em um PAPEL ou etiqueta junto ao produto.
- O PREÇO DE CUSTO e PREÇO DE VENDA podem estar na caixa, etiqueta ou papel.
- Leia TODOS os textos visíveis na imagem (manuscritos ou impressos).

Retorne APENAS um JSON estrito (sem markdown) no seguinte formato:
{
    "descricao": "Nome detalhado do produto com marca e peso/volume",
    "categoria": "Categoria sugerida (ex: Bebidas, Limpeza, Alimentos)",
    "codigo_barras": "Código de barras se visível (apenas números), ou null",
    "marca": "Marca detectada ou null",
    "unidade": "UN, KG, L, PCT, CX (conforme visível ou estimado)",
    "quantidade_atual": 0,
    "preco_custo": 0.00,
    "preco_venda": 0.00
}`;

        console.log("Sending to OpenRouter with model:", MODEL);

        // Prepare image URL - handle base64 with or without prefix
        let imageUrl = image;
        if (!image.startsWith('http') && !image.startsWith('data:')) {
            imageUrl = `data:image/webp;base64,${image}`;
        }

        const requestBody = {
            model: MODEL,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: "text", text: systemPrompt + "\n\nAnalise este produto na imagem:" },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageUrl
                            }
                        }
                    ]
                }
            ],
            temperature: 0.2,
        };

        console.log("Request body (without image):", JSON.stringify({ ...requestBody, messages: [{ ...requestBody.messages[0], content: "[image content hidden]" }] }));

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://nf-control.app',
                'X-Title': 'NF Control - Product Analyzer',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const txt = await response.text();
            console.error("OpenRouter Error Response:", txt);
            throw new Error(`API Error: ${response.status} - ${txt}`);
        }

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content;

        console.log("AI Response:", rawContent);
        console.log("Full API response:", JSON.stringify(data, null, 2));

        if (!rawContent) {
            throw new Error("AI did not return a valid response. Check API key and model availability.");
        }

        // Sanitize JSON (remove markdown code blocks if present)
        const jsonStr = rawContent.replace(/^```json\n?|\n?```$/g, '').trim();
        const result = JSON.parse(jsonStr);

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Error analyzing product:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
