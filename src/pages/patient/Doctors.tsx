
import React from 'react';
import PatientNavbar from '@/components/patient/PatientNavbar';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DoctorsList from '@/components/patient/DoctorsList';
import DoctorRecommendations from '@/components/patient/DoctorRecommendations';

const PatientDoctors = () => {
  const { user, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Find Doctors</h1>
          <p className="text-muted-foreground text-xl mt-2">
            Find and connect with healthcare providers
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-1">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Recommended Doctors</CardTitle>
            </CardHeader>
            <CardContent>
              <DoctorRecommendations />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>All Available Doctors</CardTitle>
            </CardHeader>
            <CardContent>
              <DoctorsList />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientDoctors;
