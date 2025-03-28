
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
    console.log("Starting health tip generation function...");
    
    // Check for authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ success: false, message: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Authorization header present:", !!authHeader);

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY environment variable not set");
      return new Response(
        JSON.stringify({ success: false, message: "GEMINI_API_KEY environment variable not set" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("GEMINI_API_KEY is configured");

    // Parse request body and handle potential errors
    let requestData;
    try {
      const requestText = await req.text();
      console.log("Raw request body:", requestText.substring(0, 200) + "...");
      
      try {
        requestData = JSON.parse(requestText);
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError);
        return new Response(
          JSON.stringify({ success: false, message: "Invalid JSON in request body", error: jsonError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log("Request data parsed successfully");
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ success: false, message: "Invalid request body format", error: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { user_id, recentIssues } = requestData;
    
    if (!user_id) {
      console.error("User ID is missing in request");
      return new Response(
        JSON.stringify({ success: false, message: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Generating tip for user:", user_id);
    
    // Validate and sanitize health issues
    let sanitizedIssues = [];
    if (Array.isArray(recentIssues)) {
      sanitizedIssues = recentIssues
        .filter(issue => typeof issue === 'string' && issue.trim().length > 0)
        .map(issue => issue.trim());
      
      console.log("Sanitized health issues:", JSON.stringify(sanitizedIssues));
    } else {
      console.log("No valid health issues provided, will generate general tip");
    }
    
    // Determine if we should generate a contextual tip or general tip
    const isContextual = sanitizedIssues.length > 0;
    let prompt = "";
    
    if (isContextual) {
      // Create a personalized prompt based on the user's health issues
      prompt = `
        Generate a helpful health tip that would be relevant for someone with the following recent health concerns:
        
        ${sanitizedIssues.map((issue, index) => `${index + 1}. ${issue}`).join('\n')}
        
        The tip should be educational, evidence-based, and concise, and directly relevant to the health concerns listed.
        Include a short title (max 10 words) and a detailed explanation (50-100 words).
        Format the response as a JSON object with 'title' and 'content' fields like this: {"title": "Your Title Here", "content": "Your content here"}
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
        Format the response as a JSON object with 'title' and 'content' fields like this: {"title": "Your Title Here", "content": "Your content here"}
        The content should be informative but easy to understand.
        Focus on practical advice that can be implemented in daily life.
        Include a preventive healthcare aspect or references to current seasonal health concerns if applicable.
      `;
      console.log("Using general wellness prompt");
    }

    console.log("Calling Gemini AI API");

    try {
      // Call Gemini AI API with proper error handling
      const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
      
      const geminiRequestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      };
      
      console.log("Gemini API request prepared");
      
      const geminiResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(geminiRequestBody),
      });

      console.log("Gemini API response status:", geminiResponse.status);

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error("Gemini API error details:", errorText);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Gemini API error: ${geminiResponse.status}`,
            details: errorText 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const responseText = await geminiResponse.text();
      console.log("Raw Gemini API response:", responseText.substring(0, 200) + "...");
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error("Failed to parse Gemini API response as JSON:", jsonError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Failed to parse Gemini API response as JSON",
            rawResponse: responseText.substring(0, 500)
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log("Parsed Gemini API response");
      
      if (!data.candidates || data.candidates.length === 0) {
        console.error("No candidates in Gemini API response:", JSON.stringify(data));
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "No candidates in Gemini API response",
            details: JSON.stringify(data)
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
        console.error("Missing content in Gemini API response:", JSON.stringify(data.candidates[0]));
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Missing content in Gemini API response",
            details: JSON.stringify(data.candidates[0])
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const generatedText = data.candidates[0].content.parts[0].text;
      console.log("Generated text sample:", generatedText.substring(0, 100) + "...");
      
      let tipContent;
      
      try {
        // Multiple parsing strategies to extract JSON from the response
        
        // First strategy: Try to find JSON object pattern in the text
        const jsonMatch = generatedText.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          try {
            tipContent = JSON.parse(jsonMatch[0]);
            console.log("Successfully parsed JSON using pattern matching");
          } catch (e) {
            console.log("Failed to parse matched JSON pattern, trying other methods");
          }
        }
        
        // Second strategy: Try to parse the entire response as JSON
        if (!tipContent) {
          try {
            tipContent = JSON.parse(generatedText);
            console.log("Successfully parsed entire response as JSON");
          } catch (e) {
            console.log("Failed to parse entire response as JSON, trying other methods");
          }
        }
        
        // Third strategy: Extract title and content using heuristics
        if (!tipContent) {
          console.log("Using heuristic parsing method");
          const lines = generatedText.split('\n').filter(line => line.trim());
          
          // Look for title: content patterns
          const titleMatch = generatedText.match(/["']?title["']?\s*[:=]\s*["']([^"']+)["']/i);
          const contentMatch = generatedText.match(/["']?content["']?\s*[:=]\s*["']([^"']+)["']/i);
          
          if (titleMatch && contentMatch) {
            tipContent = {
              title: titleMatch[1],
              content: contentMatch[1]
            };
            console.log("Successfully parsed using regex title/content extraction");
          } else if (lines.length >= 2) {
            // Fallback: Just use first line as title, rest as content
            tipContent = {
              title: lines[0].replace(/^["']+|["']+$/g, '').replace(/^title\s*[:=]\s*/i, ''),
              content: lines.slice(1).join('\n').replace(/^["']+|["']+$/g, '').replace(/^content\s*[:=]\s*/i, '')
            };
            console.log("Used fallback parsing method");
          }
        }
        
        // Last resort if all parsing fails
        if (!tipContent || !tipContent.title || !tipContent.content) {
          console.log("All parsing methods failed. Using manual extraction.");
          // Create a simple title and use the entire text as content
          tipContent = {
            title: isContextual ? "Personalized Health Advice" : "General Wellness Tip",
            content: generatedText.substring(0, 500) // Limit content length
          };
        }
        
        // Sanitize the content (remove any remaining quotes or JSON artifacts)
        tipContent.title = tipContent.title.replace(/^["']+|["']+$/g, '');
        tipContent.content = tipContent.content.replace(/^["']+|["']+$/g, '');
        
      } catch (parseError) {
        console.error("Error parsing Gemini response:", parseError);
        console.error("Raw response text:", generatedText);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Failed to parse the generated health tip",
            rawResponse: generatedText.substring(0, 500)
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
    } catch (apiError) {
      console.error("Error calling Gemini API:", apiError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Error calling Gemini API: " + apiError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Uncaught error in generate-health-tip function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
