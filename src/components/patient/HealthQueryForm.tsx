
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
  onQuerySubmitted?: (queryData: any) => void;
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
      const patientData = {
        symptoms: values.queryText,
        age: values.age,
        gender: values.gender,
        location: values.location,
        medicalHistory: values.medicalHistory || 'None provided'
      };
      
      console.log('Prepared patient data:', patientData);
      
      // Get authentication token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Authentication error: ' + sessionError.message);
      }
      
      if (!sessionData || !sessionData.session?.access_token) {
        throw new Error('No authentication token available. Please log in again.');
      }
      
      // Using direct fetch instead of supabase functions
      const SUPABASE_URL = "https://irkihiedlszoufsjglhw.supabase.co";
      console.log('Calling health-assessment endpoint directly via fetch');
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/health-assessment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          healthQuery: values.queryText,
          patientData
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from health-assessment endpoint:', errorText);
        throw new Error(`Health assessment failed: ${response.status} ${errorText}`);
      }
      
      const aiData = await response.json();
      console.log('Direct fetch response:', aiData ? 'Data received' : 'No data');
      
      if (!aiData) {
        console.error('No data returned from health-assessment function');
        throw new Error('No data returned from the health assessment');
      }
      
      if (aiData.error) {
        console.error('Error in AI response:', aiData.error);
        throw new Error(aiData.error);
      }
      
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
      
      if (onQuerySubmitted) {
        onQuerySubmitted({
          ...queryData,
          suggestedSpecialties: aiData.suggestedSpecialties,
          recommendedHospitals: aiData.recommendedHospitals
        });
      }
    } catch (error: any) {
      console.error('Error submitting health query:', error);
      setError(error.message || 'Failed to process your health query');
      toast.error('Failed to process your health query. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card p-8 rounded-xl">
      <h2 className="text-3xl font-semibold mb-6">Describe Your Health Concern</h2>
      
      {error && (
        <Alert variant="destructive" className="mb-6 text-lg">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-lg">{error}</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="queryText"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-xl">What symptoms are you experiencing?</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your symptoms, concerns, or health questions in detail..."
                    rows={5}
                    className="resize-none text-lg p-4"
                    required
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xl">Age</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Enter your age" 
                      disabled={isLoading}
                      className="text-lg p-4 h-14"
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
                  <FormLabel className="text-xl">Gender</FormLabel>
                  <FormControl>
                    <select 
                      className="flex h-14 w-full rounded-md border border-input bg-background px-4 py-2 text-lg ring-offset-background file:border-0 file:bg-transparent file:text-lg file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                <FormLabel className="text-xl">Location (City, Country)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., New York, USA" 
                    disabled={isLoading}
                    className="text-lg p-4 h-14"
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
                <FormLabel className="text-xl">Relevant Medical History (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any relevant medical conditions, allergies, or medications..."
                    rows={3}
                    className="resize-none text-lg p-4"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            className="w-full rounded-xl text-xl py-6 mt-4" 
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                Analyzing with Gemini AI...
              </>
            ) : (
              'Get AI Assessment'
            )}
          </Button>
          
          <p className="text-md text-muted-foreground text-center mt-4">
            This AI assessment is not a substitute for professional medical advice.
            Always consult with a healthcare provider for medical concerns.
          </p>
        </form>
      </Form>
    </div>
  );
};

export default HealthQueryForm;
