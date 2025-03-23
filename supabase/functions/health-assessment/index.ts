
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

Please include:

1. Possible conditions that might explain these symptoms:
   • List the top 3-5 potential conditions with brief explanations
   • Note their likelihood (possible, probable, etc.)

2. General recommendations:
   • Lifestyle modifications
   • Self-care measures
   • When to seek medical care

3. Medical specialists that would be appropriate to consult:
   • List the top 2-3 relevant medical specialties

4. Warning signs that would indicate a need for immediate medical attention

5. Recommended hospitals or clinics near ${patientData?.location || 'the patient'}:
   • List 3 recommended medical facilities with their specialties and approximate addresses

Format your response in a helpful, clear manner that is informative but not alarming. Use bullet points where appropriate.
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
        
        // Create a fallback assessment when API fails
        const fallbackAssessment = generateFallbackAssessment(healthQuery, patientData);
        
        return new Response(JSON.stringify({ 
          assessment: fallbackAssessment,
          suggestedSpecialties: ["General Practice", "Family Medicine"],
          recommendedHospitals: [
            { name: "Please consult with a local healthcare provider", address: "For location-specific recommendations", specialty: "General" }
          ],
          fromFallback: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      console.log('Gemini API response received successfully');
      
      if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
        console.error('Invalid response structure from Gemini API:', JSON.stringify(data));
        
        // Use fallback if response structure is invalid
        const fallbackAssessment = generateFallbackAssessment(healthQuery, patientData);
        
        return new Response(JSON.stringify({ 
          assessment: fallbackAssessment,
          suggestedSpecialties: ["General Practice", "Family Medicine"],
          recommendedHospitals: [
            { name: "Please consult with a local healthcare provider", address: "For location-specific recommendations", specialty: "General" }
          ],
          fromFallback: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
      
      // Use fallback on API error
      const fallbackAssessment = generateFallbackAssessment(healthQuery, patientData);
      
      return new Response(JSON.stringify({ 
        assessment: fallbackAssessment,
        suggestedSpecialties: ["General Practice", "Family Medicine"],
        recommendedHospitals: [
          { name: "Please consult with a local healthcare provider", address: "For location-specific recommendations", specialty: "General" }
        ],
        fromFallback: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

// Generate a basic assessment when the API is unavailable
function generateFallbackAssessment(query: string, patientData: any): string {
  const symptoms = query.toLowerCase();
  let baseAssessment = `
1. Possible conditions based on your symptoms:
   * Without a detailed medical evaluation, it's difficult to provide specific diagnoses
   * A healthcare professional should evaluate these symptoms in person
   * Multiple conditions could present with similar symptoms

2. General recommendations:
   * Rest and monitor your symptoms
   * Stay hydrated and maintain a balanced diet
   * Over-the-counter pain relievers may help with discomfort (follow package directions)
   * Avoid self-medication beyond basic pain relief

3. Medical specialists to consider:
   * Primary Care Physician / General Practitioner - for initial evaluation
   * Family Medicine - for comprehensive care

4. Warning signs that require immediate medical attention:
   * Severe, persistent pain
   * Difficulty breathing
   * Changes in consciousness or mental state
   * High fever that doesn't respond to medication
   * Unusual or severe bleeding

5. Seeking medical care:
   * Contact your primary care provider for an appointment
   * Visit an urgent care center if you need attention soon but it's not an emergency
   * Go to an emergency room or call emergency services for severe symptoms
`;

  // Add some basic symptom-specific advice if we can detect common conditions
  if (symptoms.includes("headache") || symptoms.includes("head pain") || symptoms.includes("migraine")) {
    baseAssessment += `
For headache symptoms specifically:
* Rest in a quiet, dark room
* Apply a cool compress to your forehead
* Practice stress reduction techniques
* Maintain regular sleep patterns
* Consider headache triggers like certain foods or stress`;
  }
  
  if (symptoms.includes("stomach") || symptoms.includes("nausea") || symptoms.includes("vomit") || 
      symptoms.includes("diarrhea") || symptoms.includes("digestive")) {
    baseAssessment += `
For digestive symptoms specifically:
* Follow a bland diet (toast, rice, bananas)
* Avoid spicy, fatty, or dairy foods temporarily
* Stay hydrated with clear fluids
* Eat smaller, more frequent meals
* Allow your stomach to rest if experiencing nausea`;
  }
  
  if (symptoms.includes("cough") || symptoms.includes("cold") || symptoms.includes("flu") || 
      symptoms.includes("fever") || symptoms.includes("throat")) {
    baseAssessment += `
For cold/flu symptoms specifically:
* Get plenty of rest
* Stay hydrated with warm liquids
* Use honey and lemon for sore throat (if not diabetic)
* Use a humidifier to ease congestion
* Consider over-the-counter cold medications as appropriate`;
  }

  baseAssessment += `

IMPORTANT DISCLAIMER: This is a general informational assessment only and not a medical diagnosis. 
Always consult with a qualified healthcare professional for proper diagnosis and treatment.`;

  return baseAssessment;
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

function extractRecommendedHospitals(assessment: string): Array<{ name: string, address: string, specialty: string }> {
  const hospitals: Array<{ name: string, address: string, specialty: string }> = [];
  
  // Try to find the "Recommended hospitals" section
  const sections = assessment.split(/\d+\.\s+/);
  let hospitalSection = "";
  
  // Look for the section that contains hospital recommendations
  for (const section of sections) {
    if (
      section.toLowerCase().includes("hospital") || 
      section.toLowerCase().includes("clinic") || 
      section.toLowerCase().includes("medical center") ||
      section.toLowerCase().includes("medical facility")
    ) {
      hospitalSection = section;
      break;
    }
  }
  
  if (!hospitalSection) {
    // If we couldn't identify a specific section, look for bullet points with hospital names
    const lines = assessment.split('\n');
    let inHospitalSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if we've entered a hospital section
      if (
        line.toLowerCase().includes("recommended hospital") || 
        line.toLowerCase().includes("nearby hospital") ||
        line.toLowerCase().includes("medical facilities")
      ) {
        inHospitalSection = true;
        continue;
      }
      
      // If we're in the hospital section and find a bullet point, extract hospital data
      if (inHospitalSection && (line.startsWith('*') || line.startsWith('-') || line.match(/^\d+\./))) {
        const cleanLine = line.replace(/^[\*\-\d\.]+\s*/, '').trim();
        
        // Extract name and address using common patterns
        let name = cleanLine;
        let address = "";
        let specialty = "";
        
        // Look for a separator like ":" or "-" or "located at" to separate name and address
        if (cleanLine.includes(':')) {
          [name, address] = cleanLine.split(':').map(s => s.trim());
        } else if (cleanLine.includes(' - ')) {
          [name, address] = cleanLine.split(' - ').map(s => s.trim());
        } else if (cleanLine.toLowerCase().includes('located at')) {
          [name, address] = cleanLine.split(/located at/i).map(s => s.trim());
        }
        
        // Check for specialty information
        if (address.toLowerCase().includes('specialist in') || address.toLowerCase().includes('specializing in')) {
          const specialtyMatch = address.match(/(specialist|specializing) in ([^,\.]+)/i);
          if (specialtyMatch) {
            specialty = specialtyMatch[2].trim();
            address = address.replace(/(specialist|specializing) in ([^,\.]+)/i, '').trim();
          }
        } else if (name.toLowerCase().includes('specialist in') || name.toLowerCase().includes('specializing in')) {
          const specialtyMatch = name.match(/(specialist|specializing) in ([^,\.]+)/i);
          if (specialtyMatch) {
            specialty = specialtyMatch[2].trim();
            name = name.replace(/(specialist|specializing) in ([^,\.]+)/i, '').trim();
          }
        }
        
        // If we have at least a name, add to hospitals
        if (name) {
          hospitals.push({ 
            name, 
            address: address || "Address not provided", 
            specialty: specialty || ""
          });
        }
      }
      
      // If we found 3 or more hospitals, or we've left the hospital section, break
      if (hospitals.length >= 3 || (inHospitalSection && line.match(/^\d+\.\s+/) && !line.toLowerCase().includes("hospital"))) {
        break;
      }
    }
  } else {
    // Process the hospital section if found
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
            name, 
            address: address || "Address not provided", 
            specialty: specialty || ""
          });
        }
        
        // Stop after finding 3 hospitals
        if (hospitals.length >= 3) {
          break;
        }
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
