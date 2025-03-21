
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
    const { healthQuery } = await req.json();
    
    if (!healthQuery || healthQuery.trim() === '') {
      throw new Error('Health query is required');
    }
    
    console.log('Processing health query:', healthQuery);
    
    // Generate health assessment using Gemini API
    const assessment = await generateGeminiAssessment(healthQuery);
    
    // Determine suggested specialties based on the assessment
    const suggestedSpecialties = extractSuggestedSpecialties(assessment);
    
    console.log('Assessment generated successfully');

    return new Response(JSON.stringify({ 
      assessment,
      suggestedSpecialties
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in health-assessment function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Generate health assessment using Gemini API
async function generateGeminiAssessment(healthQuery: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in the environment variables');
  }

  const prompt = `
As a healthcare AI assistant, provide a detailed assessment of the following health concerns:

"${healthQuery}"

Please include:
1. Possible conditions that might explain these symptoms
2. General recommendations
3. Which medical specialists would be appropriate to consult
4. Any warning signs that would indicate a need for immediate medical attention

Format your response in a helpful, clear manner that is informative but not alarming.
`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
          temperature: 0.4,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
      throw new Error('No content returned from Gemini API');
    }
    
    // Extract text content from the response
    const textContent = data.candidates[0].content.parts.map((part: any) => part.text).join('');
    return textContent;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return `I'm sorry, I couldn't generate an assessment at this time. Please try again later. Error: ${error.message}`;
  }
}

// Helper function to extract suggested specialties from assessment
function extractSuggestedSpecialties(assessment: string): string[] {
  const specialtiesMap: Record<string, string[]> = {
    'cardiology': ['heart', 'chest pain', 'palpitations', 'cardiovascular', 'cardiologist'],
    'dermatology': ['skin', 'rash', 'acne', 'eczema', 'dermatologist'],
    'gastroenterology': ['stomach', 'digestive', 'abdomen', 'gastroenterologist', 'digestion', 'intestinal'],
    'neurology': ['brain', 'headache', 'migraine', 'neurological', 'neurologist'],
    'orthopedics': ['bone', 'joint', 'muscle', 'orthopedic', 'fracture', 'orthopedist'],
    'psychology': ['mental health', 'anxiety', 'depression', 'stress', 'psychologist', 'psychiatric'],
    'pulmonology': ['lung', 'respiratory', 'breathing', 'pulmonologist', 'breath', 'cough'],
    'ophthalmology': ['eye', 'vision', 'ophthalmologist'],
    'ent': ['ear', 'nose', 'throat', 'otolaryngologist'],
    'endocrinology': ['hormone', 'thyroid', 'diabetes', 'endocrinologist'],
    'rheumatology': ['arthritis', 'rheumatoid', 'rheumatologist', 'autoimmune'],
    'urology': ['urinary', 'bladder', 'kidney', 'urologist'],
    'gynecology': ['gynecological', 'gynecologist', 'obstetrician'],
    'oncology': ['cancer', 'tumor', 'oncologist'],
    'allergy': ['allergy', 'allergist', 'allergic'],
    'general practice': ['general practitioner', 'family medicine', 'primary care']
  };

  const lowercaseAssessment = assessment.toLowerCase();
  const matchedSpecialties: string[] = [];

  // Check for mentions of specialists in the assessment
  for (const [specialty, keywords] of Object.entries(specialtiesMap)) {
    if (keywords.some(keyword => lowercaseAssessment.includes(keyword))) {
      // Capitalize first letter of each word
      matchedSpecialties.push(
        specialty
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      );
    }
  }

  // If no specialties were detected, return general practice
  if (matchedSpecialties.length === 0) {
    return ['General Practice', 'Family Medicine'];
  }

  return matchedSpecialties;
}
