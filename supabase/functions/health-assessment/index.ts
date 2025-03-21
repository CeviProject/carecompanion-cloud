
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Here you would typically call an AI model API like OpenAI or Gemini
    // For now, we'll simulate a response
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a simulated assessment
    const assessment = generateSimulatedAssessment(healthQuery);
    
    return new Response(JSON.stringify({ 
      assessment,
      suggestedSpecialties: getSuggestedSpecialties(assessment)
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

// Helper function to generate a simulated health assessment
function generateSimulatedAssessment(healthQuery: string): string {
  const lowercaseQuery = healthQuery.toLowerCase();
  
  // Simple pattern matching for demonstration
  if (lowercaseQuery.includes('chest pain') || lowercaseQuery.includes('heart')) {
    return "Based on your description, you may be experiencing cardiovascular issues. Chest pain can be caused by various conditions, ranging from muscle strain to more serious heart problems. It's important to consult with a cardiologist, especially if the pain is severe, persistent, or accompanied by other symptoms like shortness of breath or dizziness.";
  } else if (lowercaseQuery.includes('headache') || lowercaseQuery.includes('migraine')) {
    return "Your symptoms suggest a headache condition, which could range from tension headaches to migraines. Persistent or severe headaches should be evaluated by a neurologist, especially if they're accompanied by other symptoms such as visual disturbances, nausea, or sensitivity to light and sound.";
  } else if (lowercaseQuery.includes('joint pain') || lowercaseQuery.includes('arthritis')) {
    return "You appear to be describing joint pain, which could be related to arthritis, injury, or other inflammatory conditions. A rheumatologist can help diagnose the specific cause and recommend appropriate treatment options.";
  } else if (lowercaseQuery.includes('skin') || lowercaseQuery.includes('rash')) {
    return "Your skin symptoms could be caused by various conditions such as allergies, infections, or dermatological disorders. A dermatologist can provide a proper diagnosis and treatment plan.";
  } else if (lowercaseQuery.includes('cough') || lowercaseQuery.includes('breathing') || lowercaseQuery.includes('respiratory')) {
    return "Your respiratory symptoms could be caused by conditions ranging from common colds to chronic respiratory disorders. A pulmonologist can help diagnose and treat these conditions.";
  } else {
    return "Based on your description, I recommend consulting with a general practitioner for an initial evaluation. They can provide a comprehensive assessment and refer you to specialists if needed.";
  }
}

// Helper function to suggest medical specialties based on the assessment
function getSuggestedSpecialties(assessment: string): string[] {
  if (assessment.includes('cardiologist')) {
    return ['Cardiology'];
  } else if (assessment.includes('neurologist')) {
    return ['Neurology'];
  } else if (assessment.includes('rheumatologist')) {
    return ['Rheumatology'];
  } else if (assessment.includes('dermatologist')) {
    return ['Dermatology'];
  } else if (assessment.includes('pulmonologist')) {
    return ['Pulmonology'];
  } else {
    return ['General Practice', 'Family Medicine'];
  }
}
