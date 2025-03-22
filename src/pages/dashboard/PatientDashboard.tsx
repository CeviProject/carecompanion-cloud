
import React, { useState, useEffect } from 'react';
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
import { Bell, Calendar, Pill, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

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
  const [notifications, setNotifications] = useState<{
    appointments: number;
    medications: number;
    healthTips: number;
  }>({
    appointments: 0,
    medications: 0,
    healthTips: 0
  });

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
        setNotifications(prev => ({ ...prev, medications: medications?.length || 0 }));
        
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
        setNotifications(prev => ({ ...prev, appointments: appointments?.length || 0 }));
        
        const { data: healthQuery, error: healthQueryError } = await supabase
          .from('health_queries')
          .select('*')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (!healthQueryError && healthQuery) {
          // Process the result to match the expected HealthQueryResult type
          // Extract suggestedSpecialties and recommendedHospitals from patient_data if available
          const patientData = healthQuery.patient_data as Json;
          
          // Safely access nested properties by first casting to unknown then to a record
          const patientDataObj = patientData as unknown as Record<string, any>;
          
          const processedQueryResult: HealthQueryResult = {
            ...healthQuery as any,
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
    
    const appointmentChannel = supabase
      .channel('appointment-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${user.id}`
        },
        (payload) => {
          setUpcomingAppointments(prev => [...prev, payload.new]);
          setNotifications(prev => ({ ...prev, appointments: prev.appointments + 1 }));
          toast.success('New appointment scheduled!', {
            action: {
              label: 'View',
              onClick: () => setActiveTab('appointments')
            }
          });
        }
      )
      .subscribe();
      
    const medicationChannel = supabase
      .channel('medication-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'medications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const isForToday = isForTodayOrTomorrow(payload.new);
          if (isForToday) {
            setUpcomingMedications(prev => [...prev, payload.new]);
            setNotifications(prev => ({ ...prev, medications: prev.medications + 1 }));
            toast.success('New medication reminder added!', {
              action: {
                label: 'View',
                onClick: () => setActiveTab('medications')
              }
            });
          }
        }
      )
      .subscribe();
      
    const tipsChannel = supabase
      .channel('tips-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_tips',
          filter: `is_public=eq.true`
        },
        (payload) => {
          if (payload.new.user_id !== user.id) {
            setNotifications(prev => ({ ...prev, healthTips: prev.healthTips + 1 }));
            toast.info('New health tip shared!', {
              action: {
                label: 'View',
                onClick: () => setActiveTab('health-tips')
              }
            });
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(appointmentChannel);
      supabase.removeChannel(medicationChannel);
      supabase.removeChannel(tipsChannel);
    };
  }, [user]);

  const isForTodayOrTomorrow = (medication: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startDate = new Date(medication.start_date);
    startDate.setHours(0, 0, 0, 0);
    
    return startDate.getTime() === today.getTime() || startDate.getTime() === tomorrow.getTime();
  };

  const handleQuerySubmitted = (queryData: HealthQueryResult) => {
    setHealthQueryResult(queryData);
    setActiveTab('assessment');
    toast.success('Health query submitted successfully!');
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    if (value === 'appointments') {
      setNotifications(prev => ({ ...prev, appointments: 0 }));
    } else if (value === 'medications') {
      setNotifications(prev => ({ ...prev, medications: 0 }));
    } else if (value === 'health-tips') {
      setNotifications(prev => ({ ...prev, healthTips: 0 }));
    }
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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid grid-cols-3 lg:grid-cols-7 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="appointments" className="relative">
            Appointments
            {notifications.appointments > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notifications.appointments}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="medications" className="relative">
            Medications
            {notifications.medications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notifications.medications}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="health-query">Health Query</TabsTrigger>
          <TabsTrigger value="assessment">Assessment</TabsTrigger>
          <TabsTrigger value="health-tips" className="relative">
            Health Tips
            {notifications.healthTips > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notifications.healthTips}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="doctors">Find Doctors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Your Health Status</CardTitle>
              </CardHeader>
              <CardContent>
                <HealthAssessment minimalView={!healthQueryResult} />
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
