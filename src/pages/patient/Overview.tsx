
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import HealthAssessment from '@/components/patient/HealthAssessment';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Pill } from 'lucide-react';
import PatientNavbar from '@/components/patient/PatientNavbar';

const PatientOverview = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [upcomingMedications, setUpcomingMedications] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [healthQueryResult, setHealthQueryResult] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchOverviewData = async () => {
      try {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const { data: medications, error: medError } = await supabase
          .from('medications')
          .select('*')
          .eq('user_id', user.id)
          .lt('start_date', tomorrow.toISOString())
          .or(`end_date.is.null,end_date.gt.${today.toISOString()}`)
          .limit(3);
          
        if (medError) throw medError;
        setUpcomingMedications(medications || []);
        
        const { data: appointments, error: apptError } = await supabase
          .from('appointments')
          .select(`
            *,
            doctor_profiles!inner(*)
          `)
          .eq('patient_id', user.id)
          .eq('status', 'scheduled')
          .gt('date', today.toISOString())
          .order('date', { ascending: true })
          .limit(3);
          
        if (apptError) throw apptError;
        setUpcomingAppointments(appointments || []);
        
        const { data: healthQuery, error: healthQueryError } = await supabase
          .from('health_queries')
          .select('*')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (!healthQueryError && healthQuery) {
          // Process the result to match the expected health query result type
          const patientData = healthQuery.patient_data;
          
          // Safely access nested properties
          const patientDataObj = patientData as unknown as Record<string, any>;
          
          const processedQueryResult = {
            ...healthQuery,
            suggestedSpecialties: patientDataObj?.suggestedSpecialties ?? null,
            recommendedHospitals: patientDataObj?.recommendedHospitals ?? null
          };
          
          setHealthQueryResult(processedQueryResult);
        }
      } catch (error) {
        console.error('Error fetching overview data:', error);
      }
    };
    
    fetchOverviewData();
  }, [user]);

  if (!user || !profile) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle className="text-center">Patient Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-4">You need to be logged in to view this page.</p>
            <div className="flex justify-center">
              <Button onClick={() => navigate('/auth/login')}>Log In</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {profile.first_name}</h1>
          <p className="text-muted-foreground">
            Manage your health information and connect with healthcare providers.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Health Status</CardTitle>
            </CardHeader>
            <CardContent>
              <HealthAssessment minimalView={!healthQueryResult} />
              <Button 
                onClick={() => navigate('/patient/health-query')} 
                variant="outline" 
                className="w-full mt-4"
              >
                Submit a health query
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Medications</CardTitle>
              <Pill className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {upcomingMedications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No medications scheduled.</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingMedications.map((med) => (
                    <li key={med.id} className="text-sm">
                      <span className="font-medium">{med.name}</span> - {med.dosage}
                      <div className="text-xs text-muted-foreground">
                        {new Date(med.start_date).toLocaleDateString()} at {med.time}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Button 
                onClick={() => navigate('/patient/medications')} 
                variant="outline" 
                className="w-full mt-4"
              >
                Manage medications
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingAppointments.map((appt) => (
                    <li key={appt.id} className="text-sm">
                      <span className="font-medium">Dr. {appt.doctor_profiles?.specialty}</span>
                      <div className="text-xs text-muted-foreground">
                        {new Date(appt.date).toLocaleDateString()} at {new Date(appt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Button 
                onClick={() => navigate('/patient/appointments')} 
                variant="outline" 
                className="w-full mt-4"
              >
                Manage appointments
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientOverview;
