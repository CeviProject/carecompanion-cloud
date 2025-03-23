
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import DoctorRecommendations from '@/components/patient/DoctorRecommendations';
import PatientNavbar from '@/components/patient/PatientNavbar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

const PatientDoctors = () => {
  const { user } = useAuth();
  const [suggestedSpecialties, setSuggestedSpecialties] = useState<string[] | null>(null);

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
          // Extract suggestedSpecialties from patient_data if available
          const patientData = healthQuery.patient_data as Json;
          
          // Safely access nested properties
          const patientDataObj = patientData as unknown as Record<string, any>;
          
          setSuggestedSpecialties(patientDataObj?.suggestedSpecialties ?? null);
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
      <main className="flex-grow pt-24">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Find Doctors</h1>
            <p className="text-muted-foreground">
              Discover recommended healthcare providers for your needs.
            </p>
          </div>
          
          <Card className="border shadow-sm overflow-hidden">
            <CardContent className="pt-6">
              <DoctorRecommendations suggestedSpecialties={suggestedSpecialties} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PatientDoctors;
