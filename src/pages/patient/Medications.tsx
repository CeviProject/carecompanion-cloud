
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import MedicationReminders from '@/components/patient/MedicationReminders';
import PatientNavbar from '@/components/patient/PatientNavbar';

const PatientMedications = () => {
  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Medications</h1>
          <p className="text-xl text-muted-foreground mt-2">
            Track and manage your medication schedule.
          </p>
        </div>
        
        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-primary">
          <CardContent className="p-6 md:p-8">
            <MedicationReminders />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientMedications;
