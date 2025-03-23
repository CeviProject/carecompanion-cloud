
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import AppointmentBooking from '@/components/patient/AppointmentBooking';
import PatientNavbar from '@/components/patient/PatientNavbar';

const PatientAppointments = () => {
  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Appointments</h1>
          <p className="text-xl text-muted-foreground mt-2">
            Schedule and manage your healthcare appointments.
          </p>
        </div>
        
        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-primary">
          <CardContent className="p-6 md:p-8">
            <AppointmentBooking />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientAppointments;
