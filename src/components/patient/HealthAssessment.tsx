
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Building, MapPin, AlertCircle, Heart, Activity, Stethoscope } from 'lucide-react';

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
  
  if (minimalView) {
    return (
      <div className="text-center p-4">
        <p className="text-sm text-muted-foreground">
          Use the health query feature to get an AI-powered health assessment
        </p>
      </div>
    );
  }
  
  // Try to parse JSON if assessment is in JSON format
  let parsedAssessment = assessment;
  try {
    if (assessment && typeof assessment === 'string' && assessment.startsWith('{') && assessment.endsWith('}')) {
      const parsed = JSON.parse(assessment);
      if (parsed.assessment) {
        parsedAssessment = parsed.assessment;
      }
    }
  } catch (e) {
    console.error("Failed to parse assessment JSON:", e);
    parsedAssessment = assessment;
  }
  
  // Clean text from markdown characters
  const cleanMarkdown = (text: string): string => {
    if (!text) return '';
    
    return text
      .replace(/\*\*/g, '') // Remove double asterisks (bold)
      .replace(/\*/g, '')   // Remove single asterisks (italic)
      .replace(/__/g, '')   // Remove double underscores (bold)
      .replace(/_/g, '')    // Remove single underscores (italic)
      .replace(/`/g, '')    // Remove backticks (code)
      .replace(/#{1,6}\s/g, '') // Remove heading markers
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // Remove links, keep text
      .trim();
  };
  
  // Extract sections from the assessment text
  const extractSection = (text: string, sectionIdentifier: string): string => {
    if (!text) return "";
    
    // Try to find sections by number (1. Section Title)
    const numberedRegex = new RegExp(`\\d+\\.\\s+(${sectionIdentifier}[^\\n]*)[\\n\\s]*((?:(?!\\d+\\.).|\\n)*)`, 'i');
    const numberedMatch = text.match(numberedRegex);
    
    if (numberedMatch && numberedMatch[2]) {
      return cleanMarkdown(numberedMatch[2].trim());
    }
    
    // Try to find sections by header (Section Title:)
    const headerRegex = new RegExp(`${sectionIdentifier}[^:]*:[\\n\\s]*((?:(?!\\n\\s*\\w+:).|\\n)*)`, 'i');
    const headerMatch = text.match(headerRegex);
    
    if (headerMatch && headerMatch[1]) {
      return cleanMarkdown(headerMatch[1].trim());
    }
    
    // If no specific section found, check for keywords in paragraphs
    const paragraphs = text.split('\n\n');
    for (const paragraph of paragraphs) {
      if (paragraph.toLowerCase().includes(sectionIdentifier.toLowerCase())) {
        return cleanMarkdown(paragraph.trim());
      }
    }
    
    return "";
  };

  // Intelligently extract sections
  const possibleConditionsSection = extractSection(parsedAssessment || "", "possible conditions");
  const recommendationsSection = extractSection(parsedAssessment || "", "recommendations");
  const warningSignsSection = extractSection(parsedAssessment || "", "warning signs");
  
  // Format a section into readable paragraphs and bullet points
  const formatSection = (text: string): JSX.Element[] => {
    if (!text) return [<p key="empty" className="text-sm italic">No information available</p>];
    
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    return lines.map((paragraph, index) => {
      const cleanedText = cleanMarkdown(paragraph);
      
      // If it's a header with a colon
      if (/^[A-Za-z\s]+:/.test(cleanedText)) {
        return <h4 key={index} className="text-md font-medium mt-3 mb-1">{cleanedText}</h4>;
      }
      
      // If it's a bullet point
      if (/^[\*\-•]\s/.test(paragraph)) {
        return (
          <li key={index} className="ml-5 mb-2 text-sm">
            {cleanMarkdown(paragraph.replace(/^[\*\-•]\s/, ''))}
          </li>
        );
      }
      
      // Regular paragraph
      return <p key={index} className="mb-2 text-sm">{cleanedText}</p>;
    });
  };

  return (
    <Card className="glass-card p-6 space-y-6">
      <div>
        <div className="flex items-center mb-2">
          <Brain className="h-5 w-5 text-primary mr-2" />
          <h2 className="text-xl font-semibold">AI Health Assessment</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          This assessment is for informational purposes only and not a medical diagnosis.
        </p>
      </div>
      
      {/* Assessment sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Possible conditions section */}
        <div className="border rounded-lg p-4 bg-card/50 shadow-sm">
          <div className="flex items-center mb-3">
            <Activity className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-lg font-medium">Possible Conditions</h3>
          </div>
          <div className="space-y-1">
            {formatSection(possibleConditionsSection)}
          </div>
        </div>
        
        {/* Recommendations section */}
        <div className="border rounded-lg p-4 bg-card/50 shadow-sm">
          <div className="flex items-center mb-3">
            <Heart className="h-5 w-5 text-green-500 mr-2" />
            <h3 className="text-lg font-medium">Recommendations</h3>
          </div>
          <div className="space-y-1">
            {formatSection(recommendationsSection)}
          </div>
        </div>
        
        {/* Warning signs section */}
        <div className="border rounded-lg p-4 bg-card/50 shadow-sm">
          <div className="flex items-center mb-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
            <h3 className="text-lg font-medium">Warning Signs</h3>
          </div>
          <div className="space-y-1">
            {formatSection(warningSignsSection)}
          </div>
        </div>
        
        {/* Suggested specialties section */}
        <div className="border rounded-lg p-4 bg-card/50 shadow-sm">
          <div className="flex items-center mb-3">
            <Stethoscope className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="text-lg font-medium">Recommended Specialists</h3>
          </div>
          
          {suggestedSpecialties && suggestedSpecialties.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {suggestedSpecialties.map((specialty, index) => (
                <Badge key={index} variant="outline" className="bg-primary/10">
                  {cleanMarkdown(specialty)}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm italic">No specialist recommendations available</p>
          )}
        </div>
      </div>
      
      {/* Hospitals section */}
      {recommendedHospitals && recommendedHospitals.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <Building className="h-5 w-5 text-primary mr-2" />
            Nearby Medical Facilities
          </h3>
          <div className="space-y-3">
            {recommendedHospitals.map((hospital, index) => (
              <div key={index} className="border rounded-lg p-3 bg-card/50">
                <div className="flex items-start">
                  <Building className="h-5 w-5 text-primary mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium">{cleanMarkdown(hospital.name)}</h4>
                    <p className="text-sm text-muted-foreground flex items-center mt-1">
                      <MapPin className="h-4 w-4 mr-1" /> 
                      {cleanMarkdown(hospital.address)}
                    </p>
                    {hospital.specialty && (
                      <p className="text-xs mt-1">
                        <span className="font-medium">Specialty:</span> {cleanMarkdown(hospital.specialty)}
                      </p>
                    )}
                    {hospital.distance !== undefined && (
                      <p className="text-xs mt-1">
                        <span className="font-medium">Distance:</span>{' '}
                        {typeof hospital.distance === 'number' 
                          ? `${hospital.distance.toFixed(1)} km` 
                          : cleanMarkdown(String(hospital.distance))}
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
