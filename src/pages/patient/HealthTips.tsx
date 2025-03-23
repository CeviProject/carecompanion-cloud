
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import PatientNavbar from '@/components/patient/PatientNavbar';

const PatientHealthTips = () => {
  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <main className="flex-grow pt-24">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Health Tips</h1>
            <p className="text-muted-foreground">
              This feature is currently unavailable.
            </p>
          </div>
          
          <Card className="border shadow-sm overflow-hidden">
            <CardContent className="p-6 flex items-center justify-center">
              <p className="text-muted-foreground text-center">
                The Health Tips functionality has been removed.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PatientHealthTips;
