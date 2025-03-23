
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import HealthAssessment from '@/components/patient/HealthAssessment';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Pill, ArrowRight } from 'lucide-react';
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
      <div className="flex justify-center items-center h-screen">
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Patient Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-xl mb-4">You need to be logged in to view this page.</p>
            <div className="flex justify-center">
              <Button onClick={() => navigate('/auth/login')} className="text-xl py-6 px-8">Log In</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Welcome, {profile.first_name}</h1>
          <p className="text-muted-foreground text-xl mt-2">
            Manage your health information and connect with healthcare providers.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xl font-semibold">Your Health Status</CardTitle>
            </CardHeader>
            <CardContent>
              <HealthAssessment minimalView={!healthQueryResult} />
              <Button 
                onClick={() => navigate('/patient/health-query')} 
                variant="outline" 
                className="w-full mt-5 text-lg py-6 flex items-center justify-center"
              >
                Submit a health query
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xl font-semibold">Upcoming Medications</CardTitle>
              <Pill className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent>
              {upcomingMedications.length === 0 ? (
                <p className="text-lg text-muted-foreground py-4">No medications scheduled.</p>
              ) : (
                <ul className="space-y-4 my-4">
                  {upcomingMedications.map((med) => (
                    <li key={med.id} className="text-lg border-l-4 border-primary pl-4 py-2">
                      <span className="font-medium">{med.name}</span> - {med.dosage}
                      <div className="text-base text-muted-foreground mt-1">
                        {new Date(med.start_date).toLocaleDateString()} at {med.time}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Button 
                onClick={() => navigate('/patient/medications')} 
                variant="outline" 
                className="w-full mt-4 text-lg py-6 flex items-center justify-center"
              >
                Manage medications
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xl font-semibold">Upcoming Appointments</CardTitle>
              <Calendar className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <p className="text-lg text-muted-foreground py-4">No upcoming appointments.</p>
              ) : (
                <ul className="space-y-4 my-4">
                  {upcomingAppointments.map((appt) => (
                    <li key={appt.id} className="text-lg border-l-4 border-primary pl-4 py-2">
                      <span className="font-medium">Dr. {appt.doctor_profiles?.specialty}</span>
                      <div className="text-base text-muted-foreground mt-1">
                        {new Date(appt.date).toLocaleDateString()} at {new Date(appt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Button 
                onClick={() => navigate('/patient/appointments')} 
                variant="outline" 
                className="w-full mt-4 text-lg py-6 flex items-center justify-center"
              >
                Manage appointments
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientOverview;
