
import React from 'react';
import PatientNavbar from '@/components/patient/PatientNavbar';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import HealthTips from '@/components/patient/HealthTips';
import ElderlyHealthTips from '@/components/patient/ElderlyHealthTips';

const PatientHealthTips = () => {
  const { user, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Health Tips</h1>
          <p className="text-muted-foreground text-xl mt-2">
            Personalized health advice and recommendations
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>General Health Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <HealthTips />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Specialized Health Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ElderlyHealthTips />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientHealthTips;
