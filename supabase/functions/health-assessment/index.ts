
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
    console.log('Health assessment function started');
    
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set in the environment variables');
      throw new Error('GEMINI_API_KEY is not configured. Please set it in the Supabase dashboard under Settings > API > Edge Function Secrets.');
    }
    
    const { healthQuery, patientData } = await req.json();
    
    console.log('Request data received:', { 
      healthQuery: healthQuery ? 'Present' : 'Missing',
      patientDataPresent: patientData ? 'Present' : 'Missing'
    });
    
    if (!healthQuery || healthQuery.trim() === '') {
      throw new Error('Health query is required');
    }

    // Format patient data for the prompt
    const patientDetails = `
Patient Details:
- Age: ${patientData?.age || 'Not provided'}
- Gender: ${patientData?.gender || 'Not provided'}
- Location: ${patientData?.location || 'Not provided'}
- Medical History: ${patientData?.medicalHistory || 'None provided'}
`;

    const prompt = `
As a healthcare AI assistant, provide a detailed assessment of the following health concerns for this patient:

${patientDetails}

Patient's Symptoms and Concerns:
"${healthQuery}"

Please include each of the following sections with clear headers and structured content:

1. Possible conditions that might explain these symptoms:
   • List the top 3-5 potential conditions with brief explanations
   • Note their likelihood (possible, probable, etc.)

2. General recommendations:
   • Lifestyle modifications
   • Self-care measures
   • When to seek medical care

3. Warning signs that would indicate a need for immediate medical attention:
   • List specific symptoms or changes that require urgent care
   • Be specific about when to go to the emergency room

4. Medical specialists that would be appropriate to consult:
   • List the top 2-3 relevant medical specialties

5. Recommended hospitals or clinics near ${patientData?.location || 'the patient'}:
   • List 3 recommended medical facilities with their specialties and addresses

Format your response with clear section headings (numbered 1-5) and use simple text format with bullet points where appropriate for better readability. Avoid using markdown formatting like asterisks for bold or italics.
`;

    console.log('Making request to Gemini API with prompt length:', prompt.length);

    try {
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
      const assessment = data.candidates[0].content.parts.map((part: any) => part.text).join('');
      
      // Extract suggested specialties and recommended hospitals
      const suggestedSpecialties = extractSuggestedSpecialties(assessment);
      const recommendedHospitals = extractRecommendedHospitals(assessment);
      
      console.log('Assessment generated successfully with specialties and hospitals');

      return new Response(JSON.stringify({ 
        assessment,
        suggestedSpecialties,
        recommendedHospitals
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error during Gemini API request:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in health-assessment function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'There was a problem processing your health query. Please try again later.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to clean markdown formatting from text
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '') // Remove double asterisks (bold)
    .replace(/\*/g, '')   // Remove single asterisks (italic)
    .replace(/__/g, '')   // Remove double underscores (bold)
    .replace(/_/g, '')    // Remove single underscores (italic)
    .replace(/`/g, '')    // Remove backticks (code)
    .replace(/#{1,6}\s/g, '') // Remove heading markers
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // Remove links, keep text
    .trim();
}

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

  // Try to extract specialties from section 4 first (more accurate)
  const specialistSection = extractSection(assessment, "medical specialists");
  
  if (specialistSection) {
    // Extract bullet points from the section
    const bulletPoints = specialistSection.split('\n')
      .filter(line => /^[\*\-•]/.test(line.trim()))
      .map(line => cleanMarkdown(line.replace(/^[\*\-•]\s*/, '')));
    
    if (bulletPoints.length > 0) {
      return bulletPoints.map(specialty => {
        // If specialty contains ":" or "-", take the first part
        if (specialty.includes(':')) {
          return specialty.split(':')[0].trim();
        }
        if (specialty.includes(' - ')) {
          return specialty.split(' - ')[0].trim();
        }
        return specialty.trim();
      });
    }
  }

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

  return matchedSpecialties.map(specialty => cleanMarkdown(specialty));
}

function extractSection(text: string, sectionName: string): string {
  if (!text) return '';
  
  // Look for numbered section header (e.g., "4. Medical specialists")
  const numberedSectionRegex = new RegExp(`\\d+\\.\\s+(${sectionName}[^\\n]*)[\\n\\s]*((?:(?!\\d+\\.).|\\n)*)`, 'i');
  const numberedMatch = text.match(numberedSectionRegex);
  
  if (numberedMatch && numberedMatch[2]) {
    return numberedMatch[2].trim();
  }
  
  // Try to find sections by header (e.g., "Medical specialists:")
  const headerRegex = new RegExp(`${sectionName}[^:]*:[\\n\\s]*((?:(?!\\n\\s*\\w+:).|\\n)*)`, 'i');
  const headerMatch = text.match(headerRegex);
  
  if (headerMatch && headerMatch[1]) {
    return headerMatch[1].trim();
  }
  
  return '';
}

function extractRecommendedHospitals(assessment: string): Array<{ name: string, address: string, specialty: string }> {
  const hospitals: Array<{ name: string, address: string, specialty: string }> = [];
  
  // Extract the hospitals section specifically
  const hospitalSection = extractSection(assessment, "recommended hospitals");
  
  if (!hospitalSection) {
    return [
      {
        name: "Please consult with a local healthcare provider",
        address: "For location-specific recommendations",
        specialty: "General"
      }
    ];
  }
  
  // Process the hospital section
  const lines = hospitalSection.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Look for bullet points or numbered items
    if (trimmedLine.startsWith('*') || trimmedLine.startsWith('-') || trimmedLine.match(/^\d+\./)) {
      const cleanLine = trimmedLine.replace(/^[\*\-\d\.]+\s*/, '').trim();
      
      // Extract name and address
      let name = cleanLine;
      let address = "";
      let specialty = "";
      
      // Try to separate name from address
      if (cleanLine.includes(':')) {
        [name, address] = cleanLine.split(':').map(s => s.trim());
      } else if (cleanLine.includes(' - ')) {
        [name, address] = cleanLine.split(' - ').map(s => s.trim());
      } else if (cleanLine.toLowerCase().includes('located at')) {
        [name, address] = cleanLine.split(/located at/i).map(s => s.trim());
      }
      
      // Extract specialty if mentioned
      const specialtyMatches = [
        cleanLine.match(/specialist in ([^,\.]+)/i),
        cleanLine.match(/specializing in ([^,\.]+)/i),
        cleanLine.match(/specializes in ([^,\.]+)/i)
      ].filter(Boolean);
      
      if (specialtyMatches.length > 0) {
        specialty = specialtyMatches[0]![1].trim();
      }
      
      // If we have at least a name, add to hospitals
      if (name) {
        hospitals.push({ 
          name: cleanMarkdown(name), 
          address: cleanMarkdown(address || "Address not provided"), 
          specialty: cleanMarkdown(specialty || "")
        });
      }
      
      // Stop after finding 3 hospitals
      if (hospitals.length >= 3) {
        break;
      }
    }
  }
  
  // If we couldn't extract hospitals properly, return placeholders
  if (hospitals.length === 0) {
    return [
      {
        name: "Please consult with a local healthcare provider",
        address: "For location-specific recommendations",
        specialty: "General"
      }
    ];
  }
  
  return hospitals;
}
