
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import HealthAssessment from '@/components/patient/HealthAssessment';
import PatientNavbar from '@/components/patient/PatientNavbar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

const PatientAssessment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [healthQueryResult, setHealthQueryResult] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const fetchLatestHealthQuery = async () => {
      try {
        const { data: healthQuery, error: healthQueryError } = await supabase
          .from('health_queries')
          .select('*')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!healthQueryError && healthQuery) {
          // Process the result to match the expected health query result type
          const patientData = healthQuery.patient_data as Json;
          
          // Safely access nested properties
          const patientDataObj = patientData as unknown as Record<string, any>;
          
          const processedQueryResult = {
            ...healthQuery,
            suggestedSpecialties: patientDataObj?.suggestedSpecialties ?? null,
            recommendedHospitals: patientDataObj?.recommendedHospitals ?? null
          };
          
          setHealthQueryResult(processedQueryResult);
        }
      } catch (error) {
        console.error('Error fetching health query:', error);
      }
    };

    fetchLatestHealthQuery();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Health Assessment</h1>
          <p className="text-muted-foreground">
            Review your health assessment and recommendations.
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            {healthQueryResult ? (
              <HealthAssessment 
                assessment={healthQueryResult.ai_assessment}
                suggestedSpecialties={healthQueryResult.suggestedSpecialties}
                recommendedHospitals={healthQueryResult.recommendedHospitals}
              />
            ) : (
              <div className="text-center py-10">
                <p className="mb-4">You haven't submitted a health query yet.</p>
                <Button onClick={() => navigate('/patient/health-query')}>
                  Submit a health query now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientAssessment;
