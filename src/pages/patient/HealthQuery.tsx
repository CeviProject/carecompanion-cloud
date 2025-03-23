
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import PatientNavbar from '@/components/patient/PatientNavbar';
import ElderlyHealthChatbot from '@/components/patient/ElderlyHealthChatbot';
import { useAuth } from '@/context/AuthContext';

const PatientHealthQuery = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <main className="flex-grow pt-24">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Health Assistance</h1>
            <p className="text-xl text-muted-foreground">
              Get personalized health recommendations, nearby hospitals, pharmacies, and insurance policies.
            </p>
          </div>
          
          <Card className="border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <ElderlyHealthChatbot />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PatientHealthQuery;
