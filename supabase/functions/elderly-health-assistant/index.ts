
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface Hospital {
  name: string;
  address: string;
  distance: number;
  specialties: string[];
  elderlyFriendly: boolean;
  accessibility: string[];
}

interface Pharmacy {
  name: string;
  address: string;
  distance: number;
  openHours: string;
  deliveryAvailable: boolean;
}

interface InsurancePolicy {
  name: string;
  provider: string;
  costLevel: 'Low' | 'Medium' | 'High';
  coverage: string[];
  monthlyPremium: number;
  specialConditions: string[];
  elderlyBenefits: string[];
}

interface HealthAssistantResponse {
  assessment: string;
  hospitals: Hospital[];
  pharmacies: Pharmacy[];
  insurancePolicies: InsurancePolicy[];
  suggestedDepartments: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, patientData } = await req.json();
    console.log('Received query:', query);
    console.log('Patient data:', patientData);

    if (!query) {
      throw new Error('No query provided');
    }

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    // Create the prompt for Gemini
    const prompt = `As a medical assistant specialized in elderly healthcare in India, please analyze the following patient information and provide:

1. A detailed health assessment for this patient.
2. Suggest 4-5 nearby hospitals within 25-30 kms (if available) that specialize in elderly care for their condition.
3. Suggest 4 nearby pharmacies that could provide necessary medications.
4. Recommend 3 insurance policies each for low, medium, and high cost categories suitable for this patient's condition.
5. Suggest relevant medical departments for the patient's symptoms.

Patient information: ${query}

Please structure your response in JSON format exactly as follows:
{
  "assessment": "Detailed health assessment here with recommendations",
  "hospitals": [
    {
      "name": "Hospital Name",
      "address": "Full address",
      "distance": 5.2,
      "specialties": ["Specialty1", "Specialty2"],
      "elderlyFriendly": true,
      "accessibility": ["Wheelchair ramps", "Elevator access"]
    }
  ],
  "pharmacies": [
    {
      "name": "Pharmacy Name",
      "address": "Full address",
      "distance": 2.3,
      "openHours": "9 AM - 9 PM",
      "deliveryAvailable": true
    }
  ],
  "insurancePolicies": [
    {
      "name": "Policy Name",
      "provider": "Insurance Company",
      "costLevel": "Low/Medium/High",
      "coverage": ["Coverage detail 1", "Coverage detail 2"],
      "monthlyPremium": 3000,
      "specialConditions": ["Pre-existing conditions covered after 2 years"],
      "elderlyBenefits": ["Free health checkups", "Ambulance service"]
    }
  ],
  "suggestedDepartments": ["Geriatrics", "Orthopedics"]
}

Important:
- Provide exactly 4-5 hospitals and 4 pharmacies if possible
- For each cost level (Low, Medium, High), provide exactly 1 insurance policy
- Focus on facilities that have good accessibility for elderly patients
- Insurance policies should consider the patient's specific medical conditions
- All recommendations should be specific to Indian healthcare system and insurance market
- Only include fields shown in the example above`;

    console.log('Sending request to Gemini API...');
    
    // Call Gemini API
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
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
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
        }
      })
    });

    const geminiResponse = await response.json();
    console.log('Received response from Gemini API');

    if (!response.ok) {
      console.error('Gemini API error:', geminiResponse);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${JSON.stringify(geminiResponse)}`);
    }

    if (!geminiResponse.candidates || geminiResponse.candidates.length === 0) {
      console.error('No candidates in Gemini response:', geminiResponse);
      throw new Error('No valid response from Gemini API');
    }

    const textContent = geminiResponse.candidates[0].content.parts[0].text;
    console.log('Gemini response text:', textContent);

    // Extract the JSON from the response
    let jsonMatch;
    let assistantResponse: HealthAssistantResponse;

    try {
      // Try to parse the entire response as JSON first
      assistantResponse = JSON.parse(textContent);
    } catch (e) {
      // If that fails, try to extract JSON using regex
      jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          assistantResponse = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error('Error parsing JSON from matched content:', e2);
          throw new Error('Failed to parse JSON response from Gemini');
        }
      } else {
        console.error('Could not extract JSON from response');
        throw new Error('Could not extract structured data from Gemini response');
      }
    }

    // Apply fallback values if needed
    if (!assistantResponse.hospitals || !Array.isArray(assistantResponse.hospitals)) {
      assistantResponse.hospitals = [];
    }

    if (!assistantResponse.pharmacies || !Array.isArray(assistantResponse.pharmacies)) {
      assistantResponse.pharmacies = [];
    }

    if (!assistantResponse.insurancePolicies || !Array.isArray(assistantResponse.insurancePolicies)) {
      assistantResponse.insurancePolicies = [];
    }

    if (!assistantResponse.suggestedDepartments || !Array.isArray(assistantResponse.suggestedDepartments)) {
      assistantResponse.suggestedDepartments = [];
    }

    if (!assistantResponse.assessment || typeof assistantResponse.assessment !== 'string') {
      assistantResponse.assessment = "Unable to generate a detailed health assessment. Please consult with a healthcare professional directly.";
    }

    console.log('Successfully processed health query');
    
    return new Response(JSON.stringify(assistantResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in elderly-health-assistant function:', error);
    
    // Provide fallback response in case of error
    const fallbackResponse: HealthAssistantResponse = {
      assessment: "We're experiencing technical difficulties processing your health query. Please try again later or consult with a healthcare professional directly.",
      hospitals: [
        {
          name: "AIIMS Delhi",
          address: "Sri Aurobindo Marg, Ansari Nagar, New Delhi, Delhi 110029",
          distance: 5.0,
          specialties: ["Geriatrics", "General Medicine", "Cardiology"],
          elderlyFriendly: true,
          accessibility: ["Wheelchair access", "Patient lifts", "Senior priority"]
        },
        {
          name: "Fortis Hospital",
          address: "Sector B, Pocket 1, Aruna Asaf Ali Marg, Vasant Kunj, New Delhi, Delhi 110070",
          distance: 8.2,
          specialties: ["Orthopedics", "Neurology", "Cardiology"],
          elderlyFriendly: true,
          accessibility: ["Wheelchair access", "Assisted services"]
        }
      ],
      pharmacies: [
        {
          name: "Apollo Pharmacy",
          address: "Shop No. 5, Community Centre, New Delhi",
          distance: 2.1,
          openHours: "8 AM - 10 PM",
          deliveryAvailable: true
        },
        {
          name: "MedPlus",
          address: "Block C, Lajpat Nagar, New Delhi",
          distance: 3.5,
          openHours: "9 AM - 9 PM",
          deliveryAvailable: true
        }
      ],
      insurancePolicies: [
        {
          name: "Senior Citizen Health Insurance",
          provider: "Star Health Insurance",
          costLevel: "Low",
          coverage: ["Hospitalization up to ₹3 lakhs", "Pre-existing diseases covered after 1 year"],
          monthlyPremium: 2500,
          specialConditions: ["No medical tests required up to 65 years"],
          elderlyBenefits: ["Ambulance services", "Teleconsultation"]
        },
        {
          name: "Health Companion Senior",
          provider: "Max Bupa Health Insurance",
          costLevel: "Medium",
          coverage: ["Hospitalization up to ₹10 lakhs", "Pre-existing diseases covered after 2 years"],
          monthlyPremium: 5500,
          specialConditions: ["Simple health checkup required"],
          elderlyBenefits: ["Annual health checkup", "Home healthcare"]
        },
        {
          name: "Platinum Health Plan",
          provider: "HDFC ERGO Health",
          costLevel: "High",
          coverage: ["Hospitalization up to ₹50 lakhs", "Global coverage", "All pre-existing diseases covered"],
          monthlyPremium: 12000,
          specialConditions: ["Comprehensive health checkup required"],
          elderlyBenefits: ["Unlimited teleconsultation", "Personal medical concierge", "International treatment"]
        }
      ],
      suggestedDepartments: ["Geriatrics", "General Medicine"]
    };
    
    return new Response(JSON.stringify({
      error: error.message || 'Unknown error',
      details: "There was a problem processing your health query. Please try again later.",
      fallbackResponse
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
