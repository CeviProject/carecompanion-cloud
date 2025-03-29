
import React from 'react';
import PatientNavbar from '@/components/patient/PatientNavbar';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppointmentBooking from '@/components/patient/AppointmentBooking';

const PatientAppointments = () => {
  const { user, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground text-xl mt-2">
            Schedule and manage your medical appointments
          </p>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Book an Appointment</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentBooking />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientAppointments;
