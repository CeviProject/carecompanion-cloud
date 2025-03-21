
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain } from 'lucide-react';

interface HealthAssessmentProps {
  assessment: string | null;
  suggestedSpecialties: string[] | null;
}

const HealthAssessment = ({ assessment, suggestedSpecialties }: HealthAssessmentProps) => {
  if (!assessment) return null;
  
  // Helper function to format the assessment text
  const formatAssessment = (text: string) => {
    // Split by newlines and create paragraphs
    return text.split('\n').filter(line => line.trim() !== '').map((paragraph, index) => {
      // Check if it's a heading (numbered list with a colon)
      if (/^\d+\..*:/.test(paragraph)) {
        return <h3 key={index} className="text-md font-medium mt-4 mb-2">{paragraph}</h3>;
      }
      
      // Regular paragraph
      return <p key={index} className="mb-3 text-sm">{paragraph}</p>;
    });
  };
  
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
        
        <div className="border-l-4 border-primary pl-4 py-2 overflow-auto max-h-[500px] pr-2">
          {formatAssessment(assessment)}
        </div>
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
    </Card>
  );
};

export default HealthAssessment;
