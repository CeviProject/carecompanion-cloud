
import React from 'react';
import PatientNavbar from '@/components/patient/PatientNavbar';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import HealthAssessment from '@/components/patient/HealthAssessment';

const PatientAssessment = () => {
  const { user, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Health Assessment</h1>
          <p className="text-muted-foreground text-xl mt-2">
            View your current health assessment and track your progress
          </p>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Your Health Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <HealthAssessment />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientAssessment;
