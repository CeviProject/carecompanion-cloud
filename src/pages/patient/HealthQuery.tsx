
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import HealthQueryForm from '@/components/patient/HealthQueryForm';
import PatientNavbar from '@/components/patient/PatientNavbar';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const PatientHealthQuery = () => {
  const navigate = useNavigate();

  const handleQuerySubmitted = (queryData: any) => {
    toast.success('Health query submitted successfully!');
    navigate('/patient/assessment');
  };

  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Health Query</h1>
          <p className="text-muted-foreground">
            Submit your health concerns and symptoms for assessment.
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <HealthQueryForm onQuerySubmitted={handleQuerySubmitted} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientHealthQuery;
