
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import AppointmentBooking from '@/components/patient/AppointmentBooking';
import PatientNavbar from '@/components/patient/PatientNavbar';

const PatientAppointments = () => {
  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <main className="flex-grow pt-24">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
            <p className="text-muted-foreground">
              Schedule and manage your healthcare appointments.
            </p>
          </div>
          
          <Card className="border shadow-sm overflow-hidden">
            <CardContent className="pt-6">
              <AppointmentBooking />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PatientAppointments;
