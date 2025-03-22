import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface HealthQueryFormProps {
  onQuerySubmitted: (queryData: any) => void;
}

interface FormValues {
  queryText: string;
  age: string;
  gender: string;
  location: string;
  medicalHistory: string;
}

const HealthQueryForm = ({ onQuerySubmitted }: HealthQueryFormProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<FormValues>({
    defaultValues: {
      queryText: '',
      age: '',
      gender: '',
      location: '',
      medicalHistory: ''
    }
  });

  const handleSubmit = async (values: FormValues) => {
    // Clear any previous errors
    setError(null);
    
    if (!values.queryText.trim()) {
      toast.error('Please enter your health question');
      return;
    }
    
    if (!user) {
      toast.error('You must be logged in to submit a health query');
      return;
    }
    
    setIsLoading(true);
    toast.info('Processing your health query with AI...');
    
    try {
      console.log('Starting health query submission process');
      // Prepare patient data for the AI assessment
      const patientData = {
        symptoms: values.queryText,
        age: values.age,
        gender: values.gender,
        location: values.location,
        medicalHistory: values.medicalHistory || 'None provided'
      };
      
      console.log('Prepared patient data:', patientData);
      console.log('Calling health-assessment edge function');
      
      // Call the Gemini-powered health assessment edge function
      const { data: aiData, error: aiError } = await supabase.functions.invoke('health-assessment', {
        body: { 
          healthQuery: values.queryText,
          patientData
        }
      });
      
      console.log('Edge function response:', { data: aiData ? 'Data received' : 'No data', error: aiError });
      
      if (aiError) {
        console.error('Error from health-assessment function:', aiError);
        throw new Error(`AI assessment failed: ${aiError.message}`);
      }
      
      if (!aiData) {
        console.error('No data returned from health-assessment function');
        throw new Error('No data returned from the health assessment');
      }
      
      if (aiData.error) {
        console.error('Error in AI response:', aiData.error);
        throw new Error(aiData.error);
      }
      
      // Save the query and AI assessment to the database
      console.log('Saving health query to database');
      const { data: queryData, error: queryError } = await supabase
        .from('health_queries')
        .insert({
          patient_id: user.id,
          query_text: values.queryText,
          ai_assessment: aiData.assessment,
          patient_data: patientData
        })
        .select()
        .single();
      
      if (queryError) {
        console.error('Error saving query to database:', queryError);
        throw queryError;
      }
      
      console.log('Health query saved successfully');
      toast.success('Your health query has been analyzed');
      form.reset();
      
      // Pass the query data, AI assessment, and suggested specialties to the parent component
      onQuerySubmitted({
        ...queryData,
        suggestedSpecialties: aiData.suggestedSpecialties,
        recommendedHospitals: aiData.recommendedHospitals
      });
    } catch (error: any) {
      console.error('Error submitting health query:', error);
      setError(error.message || 'Failed to process your health query');
      toast.error('Failed to process your health query. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-semibold mb-4">Describe Your Health Concern</h2>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="queryText"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>What symptoms are you experiencing?</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your symptoms, concerns, or health questions in detail..."
                    rows={4}
                    className="resize-none"
                    required
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Enter your age" 
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <FormControl>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isLoading}
                      {...field}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location (City, Country)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., New York, USA" 
                    disabled={isLoading}
                    {...field} 
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="medicalHistory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relevant Medical History (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any relevant medical conditions, allergies, or medications..."
                    rows={2}
                    className="resize-none"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            className="w-full rounded-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing with Gemini AI...
              </>
            ) : (
              'Get AI Assessment'
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center mt-2">
            This AI assessment is not a substitute for professional medical advice.
            Always consult with a healthcare provider for medical concerns.
          </p>
        </form>
      </Form>
    </div>
  );
};

export default HealthQueryForm;
