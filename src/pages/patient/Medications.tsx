
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import MedicationReminders from '@/components/patient/MedicationReminders';
import PatientNavbar from '@/components/patient/PatientNavbar';

const PatientMedications = () => {
  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <main className="flex-grow pt-24">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Medications</h1>
            <p className="text-muted-foreground">
              Track and manage your medication schedule.
            </p>
          </div>
          
          <Card className="border shadow-sm overflow-hidden">
            <CardContent className="pt-6">
              <MedicationReminders />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PatientMedications;
