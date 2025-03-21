
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface HealthQueryFormProps {
  onQuerySubmitted: (queryData: any) => void;
}

const HealthQueryForm = ({ onQuerySubmitted }: HealthQueryFormProps) => {
  const { user } = useAuth();
  const [queryText, setQueryText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!queryText.trim()) {
      toast.error('Please enter your health question');
      return;
    }
    
    if (!user) {
      toast.error('You must be logged in to submit a health query');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First, call our AI assessment edge function
      const { data: aiData, error: aiError } = await supabase.functions.invoke('health-assessment', {
        body: { healthQuery: queryText }
      });
      
      if (aiError) throw aiError;
      
      // Save the query and AI assessment to the database
      const { data: queryData, error: queryError } = await supabase
        .from('health_queries')
        .insert({
          patient_id: user.id,
          query_text: queryText,
          ai_assessment: aiData.assessment
        })
        .select()
        .single();
      
      if (queryError) throw queryError;
      
      toast.success('Your health query has been submitted');
      setQueryText('');
      
      // Pass the query data, AI assessment, and suggested specialties to the parent component
      onQuerySubmitted({
        ...queryData,
        suggestedSpecialties: aiData.suggestedSpecialties
      });
    } catch (error) {
      console.error('Error submitting health query:', error);
      toast.error('Failed to process your health query. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-semibold mb-4">Describe Your Health Concern</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="queryText">
            What symptoms are you experiencing?
          </Label>
          <Textarea
            id="queryText"
            placeholder="Describe your symptoms, concerns, or health questions in detail..."
            rows={5}
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            className="resize-none"
            required
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full rounded-full" 
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Get AI Assessment'}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center mt-2">
          This AI assessment is not a substitute for professional medical advice.
          Always consult with a healthcare provider for medical concerns.
        </p>
      </form>
    </div>
  );
};

export default HealthQueryForm;
