import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Building, MapPin } from 'lucide-react';

interface Hospital {
  name: string;
  address: string;
  specialty: string;
  distance?: number | string;
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
}

const HealthAssessment = ({ 
  assessment, 
  suggestedSpecialties,
  recommendedHospitals,
  minimalView = false,
  queryData
}: HealthAssessmentProps) => {
  if (!assessment && !minimalView) return null;
  
  const formatAssessment = (text: string) => {
    return text.split('\n').filter(line => line.trim() !== '').map((paragraph, index) => {
      if (/^\d+\..*:/.test(paragraph)) {
        return <h3 key={index} className="text-md font-medium mt-4 mb-2">{paragraph}</h3>;
      }
      
      if (/^[\*\-]\s/.test(paragraph)) {
        return (
          <li key={index} className="ml-5 mb-2 text-sm">
            {paragraph.replace(/^[\*\-]\s/, '')}
          </li>
        );
      }
      
      return <p key={index} className="mb-3 text-sm">{paragraph}</p>;
    });
  };
  
  if (minimalView) {
    return (
      <div className="text-center p-4">
        <p className="text-sm text-muted-foreground">
          Use the health query feature to get an AI-powered health assessment
        </p>
      </div>
    );
  }
  
  let parsedAssessment = assessment;
  if (assessment && typeof assessment === 'string' && assessment.startsWith('{') && assessment.endsWith('}')) {
    try {
      const parsed = JSON.parse(assessment);
      if (parsed.assessment) {
        parsedAssessment = parsed.assessment;
      }
    } catch (e) {
      console.error("Failed to parse assessment JSON:", e);
      parsedAssessment = assessment;
    }
  }
  
  return (
    <Card className="glass-card p-6 space-y-4">
      <div>
        <div className="flex items-center mb-2">
          <Brain className="h-5 w-5 text-primary mr-2" />
          <h2 className="text-xl font-semibold">AI Health Assessment</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          This assessment is for informational purposes only and not a medical diagnosis.
        </p>
        
        {parsedAssessment && (
          <div className="border-l-4 border-primary pl-4 py-2 overflow-auto max-h-[500px] pr-2">
            {formatAssessment(parsedAssessment)}
          </div>
        )}
      </div>
      
      {suggestedSpecialties && suggestedSpecialties.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-2">Recommended Specialties</h3>
          <div className="flex flex-wrap gap-2">
            {suggestedSpecialties.map((specialty, index) => (
              <Badge key={index} variant="outline" className="bg-primary/10">
                {specialty}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {recommendedHospitals && recommendedHospitals.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-2">Nearby Medical Facilities</h3>
          <div className="space-y-3">
            {recommendedHospitals.map((hospital, index) => (
              <div key={index} className="border rounded-lg p-3 bg-card/50">
                <div className="flex items-start">
                  <Building className="h-5 w-5 text-primary mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium">{hospital.name}</h4>
                    <p className="text-sm text-muted-foreground flex items-center mt-1">
                      <MapPin className="h-4 w-4 mr-1" /> 
                      {hospital.address}
                    </p>
                    {hospital.specialty && (
                      <p className="text-xs mt-1">
                        <span className="font-medium">Specialty:</span> {hospital.specialty}
                      </p>
                    )}
                    {hospital.distance !== undefined && (
                      <p className="text-xs mt-1">
                        <span className="font-medium">Distance:</span>{' '}
                        {typeof hospital.distance === 'number' 
                          ? `${hospital.distance.toFixed(1)} km` 
                          : hospital.distance}
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
