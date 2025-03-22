
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import HealthTipsComponent from '@/components/patient/HealthTips';
import PatientNavbar from '@/components/patient/PatientNavbar';

const PatientHealthTips = () => {
  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Health Tips</h1>
          <p className="text-muted-foreground">
            Browse useful health tips and recommendations.
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <HealthTipsComponent />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientHealthTips;
