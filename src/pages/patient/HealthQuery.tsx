
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import HealthQueryForm from '@/components/patient/HealthQueryForm';
import PatientNavbar from '@/components/patient/PatientNavbar';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const PatientHealthQuery = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleQuerySubmitted = async (queryData: any) => {
    try {
      // Save the query data to the user's history for later reference
      if (user) {
        const { error } = await supabase
          .from('health_queries')
          .update({ status: 'completed' })
          .eq('id', queryData.id);
          
        if (error) throw error;
      }
      
      if (queryData.fromFallback) {
        toast.info('A general assessment has been provided. For accurate advice, please consult a healthcare professional.', {
          duration: 6000
        });
      } else {
        toast.success('Health query submitted successfully!');
      }
      
      navigate('/patient/assessment');
    } catch (error: any) {
      console.error('Error updating health query status:', error);
      toast.error('Error saving your health query. Please try again.');
      navigate('/patient/assessment');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-10 max-w-7xl pt-24">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Health Query</h1>
          <p className="text-muted-foreground text-2xl mt-3">
            Submit your health concerns and symptoms for assessment.
          </p>
        </div>
        
        <Card className="shadow-lg border-2">
          <CardContent className="pt-10 px-8 md:px-10">
            <HealthQueryForm onQuerySubmitted={handleQuerySubmitted} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientHealthQuery;
