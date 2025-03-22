
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
      console.error("GEMINI_API_KEY environment variable not set");
      throw new Error("GEMINI_API_KEY environment variable not set");
    }

    console.log("Received request to generate health tip");
    const requestData = await req.json();
    const { user_id, recentIssues } = requestData;
    
    if (!user_id) {
      console.error("User ID is missing in request");
      throw new Error("User ID is required");
    }

    console.log("Generating tip for user:", user_id);
    console.log("Recent health issues:", recentIssues ? JSON.stringify(recentIssues).substring(0, 100) + "..." : "Not available");
    
    // Prepare prompt for generating a health tip based on type
    let prompt = "";
    const isContextual = recentIssues && recentIssues.length > 0;
    
    if (isContextual) {
      // Create a personalized prompt based on the user's health issues
      prompt = `
        Generate a helpful health tip that would be relevant for someone with the following recent health concerns:
        
        ${recentIssues.map((issue: string, index: number) => `${index + 1}. ${issue}`).join('\n')}
        
        The tip should be educational, evidence-based, and concise, and directly relevant to the health concerns listed.
        Include a short title (max 10 words) and a detailed explanation (50-100 words).
        Format the response as a JSON object with 'title' and 'content' fields.
        The content should be informative, easy to understand, and actionable.
        Focus on practical preventive measures, symptom management, or lifestyle adjustments that can help with these specific health concerns.
      `;
      console.log("Using personalized prompt based on health issues");
    } else {
      // Use a general wellness tip prompt
      prompt = `
        Generate a helpful health tip for general wellness. 
        The tip should be educational, evidence-based, and concise. 
        Include a short title (max 10 words) and a detailed explanation (50-100 words). 
        Format the response as a JSON object with 'title' and 'content' fields.
        The content should be informative but easy to understand.
        Focus on practical advice that can be implemented in daily life.
        Include a preventive healthcare aspect or references to current seasonal health concerns if applicable.
      `;
      console.log("Using general wellness prompt");
    }

    console.log("Calling Gemini AI API");
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
      console.error("Gemini API error details:", errorText);
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Received response from Gemini API");
    let tipContent;
    
    try {
      // Parse the generated content to extract the JSON
      const generatedText = data.candidates[0].content.parts[0].text;
      console.log("Generated text sample:", generatedText.substring(0, 100) + "...");
      
      // Try to find and parse JSON directly
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        tipContent = JSON.parse(jsonMatch[0]);
        console.log("Successfully parsed JSON response");
      } else {
        // Fallback if JSON parsing fails
        console.log("JSON parsing failed, using fallback method");
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

    console.log("Successfully generated health tip:", tipContent.title);
    return new Response(
      JSON.stringify({
        success: true,
        tip: tipContent,
        user_id: user_id,
        context: isContextual ? "personalized" : "general"
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
