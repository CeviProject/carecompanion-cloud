
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable not set");
    }

    const { user_id } = await req.json();
    
    if (!user_id) {
      throw new Error("User ID is required");
    }

    // Prepare prompt for generating a health tip
    const prompt = `
      Generate a helpful health tip for general wellness. 
      The tip should be educational, evidence-based, and concise. 
      Include a short title (max 10 words) and a detailed explanation (50-100 words). 
      Format the response as a JSON object with 'title' and 'content' fields.
      The content should be informative but easy to understand.
      Focus on practical advice that can be implemented in daily life.
    `;

    // Call Gemini AI API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    let tipContent;
    
    try {
      // Parse the generated content to extract the JSON
      const generatedText = data.candidates[0].content.parts[0].text;
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        tipContent = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if JSON parsing fails
        const lines = generatedText.split('\n').filter(line => line.trim());
        tipContent = {
          title: lines[0],
          content: lines.slice(1).join('\n')
        };
      }
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      throw new Error("Failed to parse the generated health tip");
    }

    return new Response(
      JSON.stringify({
        success: true,
        tip: tipContent,
        user_id: user_id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating health tip:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
