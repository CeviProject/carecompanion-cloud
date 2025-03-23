
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Loader2, AlertCircle, HelpCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
          recommendedHospitals: aiData.recommendedHospitals,
          fromFallback: aiData.fromFallback
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
          <AlertCircle className="h-6 w-6" />
          <AlertDescription className="text-lg ml-2">{error}</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="queryText"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <div className="flex items-center gap-2">
                  <FormLabel className="text-2xl font-medium">What symptoms are you experiencing?</FormLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-6 w-6 text-primary cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="text-lg p-4 max-w-md">
                        Please describe any symptoms, pain, or health concerns you're having in as much detail as possible.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <FormControl>
                  <Textarea
                    placeholder="Describe your symptoms, concerns, or health questions in detail..."
                    rows={6}
                    className="resize-none text-xl p-6 rounded-xl"
                    required
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-2xl font-medium">Age</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Enter your age" 
                      disabled={isLoading}
                      className="text-xl p-6 h-16 rounded-xl"
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
                  <FormLabel className="text-2xl font-medium">Gender</FormLabel>
                  <FormControl>
                    <select 
                      className="flex h-16 w-full rounded-xl border border-input bg-background px-6 py-2 text-xl ring-offset-background file:border-0 file:bg-transparent file:text-xl file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                <FormLabel className="text-2xl font-medium">Location (City, Country)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., New York, USA" 
                    disabled={isLoading}
                    className="text-xl p-6 h-16 rounded-xl"
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
                <div className="flex items-center gap-2">
                  <FormLabel className="text-2xl font-medium">Relevant Medical History (Optional)</FormLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-6 w-6 text-primary cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="text-lg p-4 max-w-md">
                        Include any chronic conditions, allergies, medications, or past surgeries that may be relevant.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <FormControl>
                  <Textarea
                    placeholder="Any relevant medical conditions, allergies, or medications..."
                    rows={4}
                    className="resize-none text-xl p-6 rounded-xl"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            className="w-full rounded-xl text-2xl py-8 mt-6 font-medium" 
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-4 h-8 w-8 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              'Get AI Assessment'
            )}
          </Button>
          
          <p className="text-xl text-muted-foreground text-center mt-6 font-medium bg-amber-50 p-4 rounded-lg border border-amber-200">
            This AI assessment is not a substitute for professional medical advice.
            Always consult with a healthcare provider for medical concerns.
          </p>
        </form>
      </Form>
    </div>
  );
};

export default HealthQueryForm;
