
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import HealthQueryForm from '@/components/patient/HealthQueryForm';
import HealthAssessment from '@/components/patient/HealthAssessment';
import DoctorRecommendations from '@/components/patient/DoctorRecommendations';
import AppointmentBooking from '@/components/patient/AppointmentBooking';
import HealthTips from '@/components/patient/HealthTips';
import MedicationReminders from '@/components/patient/MedicationReminders';
import { supabase } from '@/integrations/supabase/client';

interface HealthQueryResult {
  id: string;
  query_text: string;
  ai_assessment: string;
  patient_data: any;
  suggestedSpecialties: string[] | null;
  recommendedHospitals: any[] | null;
}

const PatientDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [upcomingMedications, setUpcomingMedications] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [healthQueryResult, setHealthQueryResult] = useState<HealthQueryResult | null>(null);

  // Fetch upcoming medications and appointments for overview
  React.useEffect(() => {
    const fetchOverviewData = async () => {
      if (!user) return;
      
      try {
        // Fetch upcoming medications (next 24 hours)
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
        
        // Fetch upcoming appointments
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
      } catch (error) {
        console.error('Error fetching overview data:', error);
      }
    };
    
    fetchOverviewData();
  }, [user]);

  // Handle the submission of a health query
  const handleQuerySubmitted = (queryData: HealthQueryResult) => {
    setHealthQueryResult(queryData);
    // Switch to the assessment tab after a query is submitted
    setActiveTab('assessment');
  };

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
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {profile.first_name}</h1>
        <p className="text-muted-foreground">
          Manage your health information and connect with healthcare providers.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 lg:grid-cols-7 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="health-query">Health Query</TabsTrigger>
          <TabsTrigger value="assessment">Assessment</TabsTrigger>
          <TabsTrigger value="health-tips">Health Tips</TabsTrigger>
          <TabsTrigger value="doctors">Find Doctors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Your Health Status</CardTitle>
              </CardHeader>
              <CardContent>
                <HealthAssessment minimalView={true} />
                <Button 
                  onClick={() => setActiveTab('health-query')} 
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
                  onClick={() => setActiveTab('medications')} 
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
                  onClick={() => setActiveTab('appointments')} 
                  variant="outline" 
                  className="w-full mt-4"
                >
                  Manage appointments
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardContent className="pt-6">
              <AppointmentBooking />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medications">
          <Card>
            <CardContent className="pt-6">
              <MedicationReminders />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health-query">
          <Card>
            <CardContent className="pt-6">
              <HealthQueryForm onQuerySubmitted={handleQuerySubmitted} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessment">
          <Card>
            <CardContent className="pt-6">
              {healthQueryResult ? (
                <HealthAssessment 
                  assessment={healthQueryResult.ai_assessment}
                  suggestedSpecialties={healthQueryResult.suggestedSpecialties}
                  recommendedHospitals={healthQueryResult.recommendedHospitals}
                />
              ) : (
                <div className="text-center py-10">
                  <p className="mb-4">You haven't submitted a health query yet.</p>
                  <Button onClick={() => setActiveTab('health-query')}>
                    Submit a health query now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health-tips">
          <Card>
            <CardContent className="pt-6">
              <HealthTips />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="doctors">
          <Card>
            <CardContent className="pt-6">
              <DoctorRecommendations 
                suggestedSpecialties={healthQueryResult?.suggestedSpecialties}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientDashboard;
