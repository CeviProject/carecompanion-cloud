
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import AppointmentBooking from '@/components/patient/AppointmentBooking';
import PatientNavbar from '@/components/patient/PatientNavbar';

const PatientAppointments = () => {
  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">
            Schedule and manage your healthcare appointments.
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <AppointmentBooking />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientAppointments;
