
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
      <div className="container mx-auto py-6 max-w-7xl pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Health Assistance</h1>
          <p className="text-xl text-muted-foreground">
            Get personalized health recommendations, nearby hospitals, pharmacies, and insurance policies.
          </p>
        </div>
        
        <Card className="card-elderly">
          <CardContent className="pt-6">
            <ElderlyHealthChatbot />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientHealthQuery;
