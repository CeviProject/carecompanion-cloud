
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import PatientNavbar from '@/components/patient/PatientNavbar';

const PatientHealthTips = () => {
  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Health Tips</h1>
          <p className="text-xl text-muted-foreground mt-2">
            This feature is currently unavailable.
          </p>
        </div>
        
        <Card className="shadow-md hover:shadow-lg transition-shadow p-6">
          <CardContent className="flex items-center justify-center p-10">
            <p className="text-xl text-muted-foreground text-center">
              The Health Tips functionality has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientHealthTips;
