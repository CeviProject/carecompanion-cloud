
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import PatientNavbar from '@/components/patient/PatientNavbar';

const PatientHealthTips = () => {
  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Health Tips</h1>
          <p className="text-muted-foreground">
            This feature is currently unavailable.
          </p>
        </div>
        
        <Card className="shadow-md">
          <CardContent className="pt-6 flex items-center justify-center p-10">
            <p className="text-muted-foreground text-center">
              The Health Tips functionality has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientHealthTips;
