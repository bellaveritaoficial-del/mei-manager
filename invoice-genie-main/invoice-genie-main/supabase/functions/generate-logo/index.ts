import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { prompt, type } = await req.json()
        const apiKey = Deno.env.get('ATLAS_CLOUD_API_KEY')

        if (!apiKey) {
            throw new Error("Missing ATLAS_CLOUD_API_KEY secret")
        }

        // Prepare Prompt
        const fullPrompt = type === 'favicon'
            ? `favicon, icon, simple, minimalist, vector, flat design: ${prompt}`
            : `logo, corporate, vector, flat design, professional, white background: ${prompt}`;

        console.log(`Starting generation for: ${fullPrompt}`);

        // Step 1: Start image generation
        const generateUrl = 'https://api.atlascloud.ai/api/v1/model/generateImage';
        const generateResponse = await fetch(generateUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                "model": "bytedance/seedream-v4.5",
                "enable_base64_output": false,
                "prompt": fullPrompt,
                "size": "2048*2048" // Updated to meet minimum pixel requirement (3.6MP+)
            }),
        });

        if (!generateResponse.ok) {
            const err = await generateResponse.text();
            throw new Error(`Generation Start Failed: ${generateResponse.status} - ${err}`);
        }

        const generateJson = await generateResponse.json();
        const predictionId = generateJson.data?.id;

        if (!predictionId) {
            console.error("API Response:", generateJson);
            throw new Error("No prediction ID returned");
        }

        console.log(`Prediction ID: ${predictionId}. Polling for results...`);

        // Step 2: Poll for result
        const pollUrl = `https://api.atlascloud.ai/api/v1/model/prediction/${predictionId}`;
        let attempts = 0;
        const maxAttempts = 30; // 60 seconds max ideally

        const checkStatus = async (): Promise<string> => {
            attempts++;
            if (attempts > maxAttempts) throw new Error("Timeout waiting for image generation");

            const response = await fetch(pollUrl, {
                headers: { Authorization: `Bearer ${apiKey}` },
            });

            if (!response.ok) {
                // If poll fails, try one more time or throw
                console.log("Poll error, retrying...");
            }

            const result = await response.json();
            const status = result.data?.status;

            console.log(`Poll attempt ${attempts}: ${status}`);

            if (status === 'completed') {
                return result.data.outputs[0]; // Assuming this is the URL based on snippet
            } else if (status === 'failed') {
                throw new Error(result.data.error || 'Generation failed');
            } else {
                // Wait 2 seconds
                await new Promise(resolve => setTimeout(resolve, 2000));
                return checkStatus();
            }
        };

        const imageUrl = await checkStatus();

        // 4. Return result
        return new Response(
            JSON.stringify({
                message: "Success",
                image_url: imageUrl,
                prompt: fullPrompt
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error("Edge Function Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
