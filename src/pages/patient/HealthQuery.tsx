
import React from 'react';
import PatientNavbar from '@/components/patient/PatientNavbar';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import HealthQueryForm from '@/components/patient/HealthQueryForm';

const PatientHealthQuery = () => {
  const { user, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Health Assistant</h1>
          <p className="text-muted-foreground text-xl mt-2">
            Get personalized health recommendations by answering a few questions
          </p>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Submit a Health Query</CardTitle>
          </CardHeader>
          <CardContent>
            <HealthQueryForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientHealthQuery;
