
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Building, MapPin, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Hospital {
  name: string;
  address: string;
  specialty: string;
}

export interface HealthQuery {
  id: string;
  patient_id: string;
  query_text: string;
  ai_assessment: string;
  patient_data: any;
  created_at: string;
  status: string;
}

interface HealthAssessmentProps {
  assessment?: string | null;
  suggestedSpecialties?: string[] | null;
  recommendedHospitals?: Hospital[] | null;
  minimalView?: boolean;
  queryData?: HealthQuery;
  fromFallback?: boolean;
}

const HealthAssessment = ({ 
  assessment, 
  suggestedSpecialties,
  recommendedHospitals,
  minimalView = false,
  queryData,
  fromFallback = false
}: HealthAssessmentProps) => {
  if (!assessment && !minimalView) return null;
  
  // Helper function to format the assessment text
  const formatAssessment = (text: string) => {
    // Split by newlines and create paragraphs
    return text.split('\n').filter(line => line.trim() !== '').map((paragraph, index) => {
      // Check if it's a heading (numbered list with a colon)
      if (/^\d+\..*:/.test(paragraph)) {
        return <h3 key={index} className="text-xl font-medium mt-6 mb-3">{paragraph}</h3>;
      }
      
      // Check if it's a bullet point (asterisk or dash)
      if (/^[\*\-]\s/.test(paragraph)) {
        return (
          <li key={index} className="ml-8 mb-3 text-lg list-disc">
            {paragraph.replace(/^[\*\-]\s/, '')}
          </li>
        );
      }
      
      // Regular paragraph
      return <p key={index} className="mb-4 text-lg">{paragraph}</p>;
    });
  };
  
  if (minimalView) {
    return (
      <div className="text-center p-6">
        <p className="text-xl text-muted-foreground">
          Use the health query feature to get an AI-powered health assessment
        </p>
      </div>
    );
  }
  
  return (
    <Card className="glass-card p-8 space-y-6 shadow-lg">
      <div>
        <div className="flex items-center mb-4">
          <Brain className="h-8 w-8 text-primary mr-3" />
          <h2 className="text-3xl font-semibold">AI Health Assessment</h2>
        </div>
        
        {fromFallback && (
          <Alert variant="warning" className="mb-6 bg-amber-50 border-amber-300">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <AlertDescription className="text-lg ml-2 text-amber-800">
              This is a general assessment. Our AI service is currently experiencing issues. For the most accurate advice, please consult a healthcare professional.
            </AlertDescription>
          </Alert>
        )}
        
        <p className="text-muted-foreground text-xl mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
          This assessment is for informational purposes only and not a medical diagnosis.
          Always consult with a qualified healthcare professional.
        </p>
        
        {assessment && (
          <div className="border-l-4 border-primary pl-6 py-4 overflow-auto max-h-[600px] pr-4 bg-white rounded-r-lg">
            {formatAssessment(assessment)}
          </div>
        )}
      </div>
      
      {suggestedSpecialties && suggestedSpecialties.length > 0 && (
        <div className="mt-8">
          <h3 className="text-2xl font-medium mb-4">Recommended Specialties</h3>
          <div className="flex flex-wrap gap-3">
            {suggestedSpecialties.map((specialty, index) => (
              <Badge key={index} variant="outline" className="bg-primary/10 text-lg py-2 px-4">
                {specialty}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {recommendedHospitals && recommendedHospitals.length > 0 && (
        <div className="mt-8">
          <h3 className="text-2xl font-medium mb-4">Nearby Medical Facilities</h3>
          <div className="space-y-4">
            {recommendedHospitals.map((hospital, index) => (
              <div key={index} className="border rounded-lg p-5 bg-card/50 hover:bg-card/80 transition-colors">
                <div className="flex items-start">
                  <Building className="h-7 w-7 text-primary mr-3 mt-1" />
                  <div>
                    <h4 className="font-medium text-xl">{hospital.name}</h4>
                    <p className="text-lg text-muted-foreground flex items-center mt-2">
                      <MapPin className="h-5 w-5 mr-2" /> 
                      {hospital.address}
                    </p>
                    {hospital.specialty && (
                      <p className="text-lg mt-2">
                        <span className="font-medium">Specialty:</span> {hospital.specialty}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default HealthAssessment;
