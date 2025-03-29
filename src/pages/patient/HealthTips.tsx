
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import PatientNavbar from '@/components/patient/PatientNavbar';
import ElderlyHealthTips from '@/components/patient/ElderlyHealthTips';

const PatientHealthTips = () => {
  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Health Tips for Elderly</h1>
          <p className="text-xl text-muted-foreground mt-2">
            Get personalized health recommendations based on your history or general elderly care tips.
          </p>
        </div>
        
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <ElderlyHealthTips />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientHealthTips;
