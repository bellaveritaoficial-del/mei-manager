// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import JSON5 from 'https://esm.sh/json5@2.2.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function extractJSON(text: string): string {
  const firstOpen = text.indexOf('{');
  const lastClose = text.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    return text.substring(firstOpen, lastClose + 1);
  }
  return text;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Read raw text first to debug "Unexpected end of JSON input"
    const rawBody = await req.text();
    console.log('Request Body Length:', rawBody.length);
    console.log('Request Content-Type:', req.headers.get('content-type'));

    if (!rawBody) {
      console.error('Empty request body received');
      throw new Error('Empty request body received from client');
    }

    const { image } = JSON.parse(rawBody);

    if (!image) {
      console.error('No image provided in JSON')
      throw new Error('No image provided')
    }

    console.log('Image received. Calling OpenRouter...')

    // Call OpenRouter (Amazon Nova 2 Lite)
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!openRouterKey) {
      console.error('Missing OPENROUTER_API_KEY')
      throw new Error('Chave da API (OPENROUTER_API_KEY) não configurada no Supabase.')
    }

    console.log('Calling OpenRouter URL: https://openrouter.ai/api/v1/chat/completions');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://invoice-genie.app', // Required by OpenRouter for free tier
        'X-Title': 'Invoice Genie',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        reasoning: { enabled: true },
        messages: [
          {
            role: 'system',
            content: `You are an expert financial OCR assistant for Brazilian documents. Analyze the provided image of a financial document.

**SUPPORTED DOCUMENT TYPES:**
- "nota_fiscal" ou "nfe" (Nota Fiscal Eletrônica / DANFE)
- "promissory_note" (Nota Promissória)
- "boleto" (Boleto Bancário)
- "recibo" (Recibo de Pagamento)
- "unknown" (Documento não identificado)
            
Extract the following data into a strictly valid JSON format:
{
  "document_type": "nfe" | "promissory_note" | "boleto" | "recibo" | "unknown",
  "invoice": {
    "numero": "000175",
    "serie": "001",
    "chave_acesso": "44 digits NFe key if visible",
    "data_emissao": "YYYY-MM-DD",
    "natureza_operacao": "VENDA DE MERCADORIA",
    "valor_total_nota": 230.00,
    "valor_total_produtos": 230.00,
    "valor_icms": 0.00,
    "valor_frete": 0.00,
    "valor_seguro": 0.00,
    "desconto": 0.00
  },
  "emitente": {
    "razao_social": "Company Name",
    "nome_fantasia": "Trade Name",
    "cnpj": "00.000.000/0001-00",
    "inscricao_estadual": "000.000.000.000",
    "endereco": "Full Address",
    "municipio": "City",
    "uf": "MT",
    "cep": "00000-000",
    "telefone": "+55..."
  },
  "destinatario": {
    "razao_social": "Customer Name",
    "cnpj_cpf": "000.000.000-00 or 00.000.000/0001-00",
    "inscricao_estadual": "",
    "endereco": "Full Address",
    "municipio": "City",
    "uf": "SP",
    "cep": "00000-000"
  },
  "produtos": [
    {
      "codigo": "001",
      "descricao": "Product Description",
      "ncm": "00000000",
      "cfop": "5102",
      "unidade": "UN",
      "quantidade": 1.0000,
      "valor_unitario": 230.0000,
      "valor_total": 230.00
    }
  ],
  "customer": {
    "name": "Full Name (from 'Emitente' for Nota Promissória, or 'Destinatário' for NF-e)",
    "cpf_cnpj": "000.000.000-00",
    "phone": "+55...",
    "address": {
      "street": "Street Name",
      "number": "123",
      "neighborhood": "Bairro",
      "city": "City",
      "state": "UF",
      "cep": "00000-000"
    }
  },
  "charge": {
    "amount": 1000.00,
    "due_date": "YYYY-MM-DD",
    "issue_date": "YYYY-MM-DD",
    "document_number": "123",
    "title": "Title or Description"
  }
}

**CRITICAL INSTRUCTIONS FOR NF-e (Nota Fiscal Eletrônica / DANFE):**
1. Extract "Nº" (numero) and "SÉRIE" from the DANFE header.
2. Extract "CHAVE DE ACESSO" (44 digits) if visible.
3. "NATUREZA DA OPERAÇÃO" should be exactly as written (e.g., "VENDA DE MERCADORIA").
4. "DATA/HORA EMISSÃO" → converted to YYYY-MM-DD format.
5. "VALOR TOTAL DA NOTA" is usually highlighted in red/bold near the bottom.
6. Extract all items from "DADOS DOS PRODUTOS / SERVIÇOS" table.
7. "Emitente" is the SELLER (top left). "Destinatário" is the BUYER.

**CRITICAL INSTRUCTIONS FOR "NOTA PROMISSÓRIA":**
1. The "Emitente" (Issuer) is the DEBTOR (the Customer). Extract their Name, CPF/CNPJ, and Address into the "customer" object.
2. The "Vencimento" (Due Date) is usually prominent. Convert "13 de Janeiro de 2025" to "2025-01-13".
3. The value ("R$") is the "amount". Return as a NUMBER (e.g., 500.00). Do NOT return a string.
4. "Ao(s)" represents the Creditor - DO NOT extract this as the customer.

**CRITICAL FOR DATES:**
- Convert "13 de Janeiro de 2025" to "2025-01-13".
- Convert "15/12/2025" to "2025-12-15".
- If date appears incorrect (OCR error), try to infer the correct date.

**CRITICAL FOR VALUES:**
- All monetary values must be NUMBERS, not strings.
- R$ 230,00 should be returned as 230.00 (using period as decimal separator).
- R$ 1.127,00 should be returned as 1127.00.

Return ONLY the valid JSON. No markdown, no explanations.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract data from this financial document.' },
              {
                type: 'image_url',
                image_url: {
                  url: image // Expecting base64 data url here
                }
              }
            ]
          }
        ],
        max_tokens: 2500
      })
    })

    console.log('OpenRouter Response Status:', response.status);

    const rawText = await response.text();
    console.log('OpenRouter Raw Output (start):', rawText.substring(0, 500));

    // Handle non-200 responses specifically
    if (!response.ok) {
      console.error(`OpenRouter API Error ${response.status}:`, rawText);
      let errorMessage = `OpenRouter API Error ${response.status}`;
      try {
        const errJson = JSON.parse(rawText);
        if (errJson.error && errJson.error.message) {
          errorMessage += `: ${errJson.error.message}`;
        } else if (errJson.error) {
          errorMessage += `: ${JSON.stringify(errJson.error)}`;
        }
      } catch {
        errorMessage += `: ${rawText || response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    if (!rawText) {
      throw new Error('OpenRouter returned empty response');
    }

    let aiData;
    try {
      aiData = JSON.parse(rawText);
    } catch (e) {
      console.error('Failed to parse OpenRouter JSON:', e);
      throw new Error('Invalid JSON from AI provider: ' + rawText.substring(0, 100));
    }

    if (aiData.error) {
      console.error('OpenRouter Returned Error Object:', aiData.error);
      throw new Error(aiData.error.message || 'Error calling OpenRouter (Unknown)');
    }

    if (!aiData.choices || !aiData.choices[0] || !aiData.choices[0].message) {
      console.error('Unexpected OpenRouter structure:', aiData);
      throw new Error('Unexpected response structure from AI');
    }

    let content = aiData.choices[0].message.content;

    if (Array.isArray(content)) {
      content = content
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('\n');
    }

    if (typeof content !== 'string') {
      throw new Error('AI content is not text');
    }

    console.log('AI Content:', content);

    // Clean up markdown code blocks if present
    const cleaned = content.replace(/```json\n?|\n?```/g, '') // remove ```json and ```
      .replace(/^`+|`+$/g, '')          // remove single backticks
      .trim();

    let parsedData;
    try {
      const jsonStr = extractJSON(cleaned);
      console.log('FINAL JSON STRING:', jsonStr);
      parsedData = JSON5.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI content as JSON:', content);
      throw new Error('AI did not return valid JSON. Content: ' + content.substring(0, 50));
    }

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge Function Error:', error)
    // Return 200 even on error to ensure client receives the JSON body
    // instead of a generic "non-2xx status code" error from the SDK.
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Returning 200 so the client can read the error message in the body
      }
    )
  }
})
