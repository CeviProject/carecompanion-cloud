
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DoctorRecommendations from '@/components/patient/DoctorRecommendations';
import DoctorsList from '@/components/patient/DoctorsList';
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
      <div className="container mx-auto py-6 max-w-7xl pt-24">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Find Doctors</h1>
          <p className="text-xl text-muted-foreground mt-2">
            Discover recommended healthcare providers for your needs.
          </p>
        </div>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6 text-lg">
            <TabsTrigger value="all" className="px-6 py-3 text-lg">All Doctors</TabsTrigger>
            <TabsTrigger value="recommended" className="px-6 py-3 text-lg">Recommended For You</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <Card className="shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-primary">
              <CardContent className="p-6 md:p-8">
                <DoctorsList />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="recommended">
            <Card className="shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-primary">
              <CardContent className="p-6 md:p-8">
                <DoctorRecommendations suggestedSpecialties={suggestedSpecialties} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PatientDoctors;
