
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generate health tip function started');
    
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set in the environment variables');
      throw new Error('GEMINI_API_KEY is not configured. Please set it in the Supabase dashboard under Settings > API > Edge Function Secrets.');
    }
    
    const { userContext } = await req.json();
    
    console.log('User context received:', {
      queriesPresent: userContext?.queries ? 'Present' : 'Missing',
      queryCount: userContext?.queries?.length || 0
    });
    
    // Prepare prompt for health tip generation
    let prompt = `
As a healthcare AI assistant, generate ONE personalized health tip that is concise, actionable, and evidence-based.

The tip should be:
1. Brief but impactful (2-3 sentences maximum)
2. Specific and actionable
3. Evidence-based and medically sound
4. Written in a friendly, encouraging tone

Format your response as a JSON object with two fields:
- "title": A short, catchy title for the health tip (5-7 words maximum)
- "tip": The actual health tip content (2-3 sentences)

Example of the expected format:
{
  "title": "Stay Hydrated for Better Health",
  "tip": "Drink at least 8 glasses of water daily to maintain proper hydration. This supports cognitive function, energy levels, and helps prevent headaches and fatigue."
}
`;

    // Add user context if available
    if (userContext && userContext.queries && userContext.queries.length > 0) {
      prompt += `\n\nGenerate a tip that might be relevant based on the following health topics the user has queried about:\n`;
      
      userContext.queries.forEach((query: any, index: number) => {
        prompt += `${index + 1}. ${query.query_text}\n`;
      });
      
      prompt += `\nMake sure the tip is relevant to these health topics if possible, but still general enough to be broadly applicable.`;
    } else {
      // If no context, provide some general categories
      prompt += `\n\nGenerate a tip from one of these general health categories:
- Nutrition and diet
- Physical activity and exercise
- Mental health and stress management
- Sleep hygiene
- Preventive health measures`;
    }

    console.log('Making request to Gemini API with prompt length:', prompt.length);

    const apiUrl = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
    console.log('Using Gemini API URL:', GEMINI_API_URL);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 256,
        }
      }),
    });

    console.log('Gemini API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error details:', errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini API response received successfully');
    
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
      console.error('Invalid response structure from Gemini API:', JSON.stringify(data));
      throw new Error('No content returned from Gemini API');
    }
    
    // Extract text content from the response
    const rawContent = data.candidates[0].content.parts.map((part: any) => part.text).join('');
    
    // Parse the JSON response
    let parsedContent;
    try {
      // Clean the response if needed to ensure it's valid JSON
      const jsonStr = rawContent.trim();
      parsedContent = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.log('Raw content:', rawContent);
      
      // Try to extract using regex as fallback
      const titleMatch = rawContent.match(/"title"\s*:\s*"([^"]+)"/);
      const tipMatch = rawContent.match(/"tip"\s*:\s*"([^"]+)"/);
      
      if (titleMatch && tipMatch) {
        parsedContent = {
          title: titleMatch[1],
          tip: tipMatch[1]
        };
      } else {
        throw new Error('Failed to parse response as JSON and extraction fallback failed');
      }
    }
    
    console.log('Successfully generated health tip');

    return new Response(JSON.stringify({ 
      title: parsedContent.title,
      tip: parsedContent.tip
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-health-tip function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'There was a problem generating the health tip. Please try again later.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
