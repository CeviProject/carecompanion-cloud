
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HealthAssessmentProps {
  assessment: string | null;
  suggestedSpecialties: string[] | null;
}

const HealthAssessment = ({ assessment, suggestedSpecialties }: HealthAssessmentProps) => {
  if (!assessment) return null;
  
  return (
    <Card className="glass-card p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-2">AI Health Assessment</h2>
        <p className="text-muted-foreground text-sm mb-4">
          This assessment is for informational purposes only and not a medical diagnosis.
        </p>
        
        <div className="border-l-4 border-primary pl-4 py-2">
          <p className="text-sm">{assessment}</p>
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
