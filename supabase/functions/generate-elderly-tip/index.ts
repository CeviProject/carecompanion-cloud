
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
    console.log("Starting elderly health tip generation function...");
    
    // Check for authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ success: false, message: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY environment variable not set");
      return new Response(
        JSON.stringify({ success: false, message: "GEMINI_API_KEY environment variable not set" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body and handle potential errors
    let requestData;
    try {
      const requestText = await req.text();
      console.log("Raw request body:", requestText.substring(0, 200) + "...");
      requestData = JSON.parse(requestText);
      console.log("Request data parsed successfully");
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ success: false, message: "Invalid request body format", error: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { user_id, recentIssues, demographic } = requestData;
    
    if (!user_id) {
      console.error("User ID is missing in request");
      return new Response(
        JSON.stringify({ success: false, message: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Generating tip for elderly user:", user_id);
    
    // Validate and sanitize health issues
    let sanitizedIssues = [];
    if (Array.isArray(recentIssues)) {
      sanitizedIssues = recentIssues
        .filter(issue => typeof issue === 'string' && issue.trim().length > 0)
        .map(issue => issue.trim());
      
      console.log("Sanitized health issues:", sanitizedIssues);
    }
    
    // Create a prompt focused on elderly health
    let prompt = "";
    
    if (sanitizedIssues.length > 0) {
      // Create a personalized prompt based on the user's health issues
      prompt = `
        Generate a helpful health tip specifically for elderly patients that would be relevant for someone with these recent health concerns:
        
        ${sanitizedIssues.map((issue, index) => `${index + 1}. ${issue}`).join('\n')}
        
        The tip should be educational, evidence-based, and concise, focusing on:
        1. Special considerations for elderly people (65+ years)
        2. Safety precautions appropriate for older adults
        3. Simple, practical advice that's easy to follow for seniors
        4. Consideration of potential mobility issues, polypharmacy, or multiple chronic conditions
        
        Format the response as a JSON object with 'title', 'content', and 'category' fields.
        The title should be clear and direct (max 10 words).
        The content should be 75-100 words, easy to understand, avoiding technical jargon.
        The category should be a single term describing the main focus (e.g., "Nutrition", "Exercise", "Medication", "Safety").
      `;
    } else {
      // Use a general elderly wellness tip prompt
      prompt = `
        Generate a helpful health tip specifically for elderly patients (65+ years old).
        The tip should address common challenges faced by older adults, such as:
        
        1. Fall prevention
        2. Medication management
        3. Proper nutrition and hydration
        4. Managing chronic conditions
        5. Staying physically active safely
        6. Cognitive health
        7. Social engagement and mental wellbeing
        
        Format the response as a JSON object with 'title', 'content', and 'category' fields.
        The title should be clear and direct (max 10 words).
        The content should be 75-100 words, easy to understand, avoiding technical jargon.
        The category should be a single term describing the main focus (e.g., "Nutrition", "Exercise", "Medication", "Safety").
      `;
    }

    console.log("Calling Gemini AI API with elderly-focused prompt");

    try {
      // Call Gemini AI API
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

      const data = await geminiResponse.json();
      
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
          const categoryMatch = generatedText.match(/["']?category["']?\s*[:=]\s*["']([^"']+)["']/i);
          
          if (titleMatch && contentMatch) {
            tipContent = {
              title: titleMatch[1],
              content: contentMatch[1],
              category: categoryMatch ? categoryMatch[1] : 'General'
            };
            console.log("Successfully parsed using regex title/content extraction");
          } else if (lines.length >= 2) {
            // Fallback: Just use first line as title, rest as content
            tipContent = {
              title: lines[0].replace(/^["']+|["']+$/g, '').replace(/^title\s*[:=]\s*/i, ''),
              content: lines.slice(1).join('\n').replace(/^["']+|["']+$/g, '').replace(/^content\s*[:=]\s*/i, ''),
              category: 'General'
            };
            console.log("Used fallback parsing method");
          }
        }
        
        // Last resort if all parsing fails
        if (!tipContent || !tipContent.title || !tipContent.content) {
          console.log("All parsing methods failed. Using manual extraction.");
          // Create a simple title and use the entire text as content
          tipContent = {
            title: "Elderly Health Advice",
            content: generatedText.substring(0, 500), // Limit content length
            category: "General"
          };
        }
        
        // Sanitize the content (remove any remaining quotes or JSON artifacts)
        tipContent.title = tipContent.title.replace(/^["']+|["']+$/g, '');
        tipContent.content = tipContent.content.replace(/^["']+|["']+$/g, '');
        if (tipContent.category) {
          tipContent.category = tipContent.category.replace(/^["']+|["']+$/g, '');
        }
        
      } catch (parseError) {
        console.error("Error parsing Gemini response:", parseError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Failed to parse the generated health tip",
            rawResponse: generatedText.substring(0, 500)
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log("Successfully generated elderly health tip:", tipContent.title);
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
    console.error("Uncaught error in generate-elderly-tip function:", error);
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
