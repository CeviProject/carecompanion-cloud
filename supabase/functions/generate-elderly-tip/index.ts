
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

// Fallback tips in case the API fails
const fallbackTips = [
  {
    title: "Stay Hydrated",
    content: "As we age, our sense of thirst may decrease. Remember to drink water regularly throughout the day, even when not feeling thirsty. Proper hydration helps maintain energy levels, supports kidney function, and can prevent confusion. Keep a water bottle within easy reach at all times.",
    category: "Wellness"
  },
  {
    title: "Fall Prevention",
    content: "Remove tripping hazards like loose rugs and cords from walkways. Install grab bars in the bathroom and ensure good lighting throughout your home, especially on staircases. Wear supportive, non-slip footwear, and consider using a cane or walker if you experience unsteadiness.",
    category: "Safety"
  },
  {
    title: "Medication Management",
    content: "Keep a current list of all medications, including over-the-counter drugs and supplements. Use pill organizers to sort medications by day and time. Set alarms as reminders, and never skip doses without consulting your healthcare provider. Review all medications with your doctor at least once a year.",
    category: "Medication"
  },
  {
    title: "Heart-Healthy Eating",
    content: "Focus on a diet rich in fruits, vegetables, whole grains, and lean proteins. Limit sodium, saturated fats, and added sugars. Choose healthy fats from sources like olive oil, avocados, and nuts. Keeping your heart healthy helps maintain overall wellness and independence as you age.",
    category: "Nutrition"
  },
  {
    title: "Stay Socially Active",
    content: "Regular social interaction is vital for mental health. Stay connected with family and friends through regular visits, phone calls, or video chats. Consider joining community centers, clubs, or volunteer organizations that match your interests to maintain meaningful social connections.",
    category: "Mental Health"
  }
];

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
      // Return a fallback tip
      const randomTip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
      return new Response(
        JSON.stringify({ 
          success: true, 
          tip: randomTip,
          fromFallback: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      // Return a fallback tip
      const randomTip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
      return new Response(
        JSON.stringify({ 
          success: true, 
          tip: randomTip,
          fromFallback: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        
        // Use a fallback tip when API fails
        const randomTip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
        return new Response(
          JSON.stringify({ 
            success: true, 
            tip: randomTip,
            fromFallback: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await geminiResponse.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        console.error("No candidates in Gemini API response:", JSON.stringify(data));
        
        // Use a fallback tip
        const randomTip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
        return new Response(
          JSON.stringify({ 
            success: true, 
            tip: randomTip,
            fromFallback: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          console.log("All parsing methods failed. Using fallback tip.");
          
          // Use a pre-defined fallback tip
          const randomTip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
          tipContent = randomTip;
        }
        
        // Sanitize the content if needed (remove any remaining quotes or JSON artifacts)
        if (tipContent !== fallbackTips[0]) {  // Only clean if it's not already a fallback tip
          tipContent.title = tipContent.title.replace(/^["']+|["']+$/g, '');
          tipContent.content = tipContent.content.replace(/^["']+|["']+$/g, '');
          if (tipContent.category) {
            tipContent.category = tipContent.category.replace(/^["']+|["']+$/g, '');
          }
        }
        
      } catch (parseError) {
        console.error("Error parsing Gemini response:", parseError);
        
        // Use a fallback tip
        const randomTip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
        return new Response(
          JSON.stringify({ 
            success: true, 
            tip: randomTip,
            fromFallback: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      
      // Use a fallback tip when API fails
      const randomTip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
      return new Response(
        JSON.stringify({ 
          success: true, 
          tip: randomTip,
          fromFallback: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Uncaught error in generate-elderly-tip function:", error);
    
    // Use a fallback tip on any error
    const randomTip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
    return new Response(
      JSON.stringify({
        success: true,
        tip: randomTip,
        fromFallback: true
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
