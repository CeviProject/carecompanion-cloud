
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import MedicationReminders from '@/components/patient/MedicationReminders';
import PatientNavbar from '@/components/patient/PatientNavbar';

const PatientMedications = () => {
  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Medications</h1>
          <p className="text-muted-foreground">
            Track and manage your medication schedule.
          </p>
        </div>
        
        <Card className="shadow-md border-t-4 border-t-primary">
          <CardContent className="pt-6">
            <MedicationReminders />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientMedications;
