
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill, Calendar, Clock, User, History, Bell, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import HealthQueryForm from '@/components/patient/HealthQueryForm';
import HealthAssessment from '@/components/patient/HealthAssessment';
import DoctorRecommendations from '@/components/patient/DoctorRecommendations';
import AppointmentBooking from '@/components/patient/AppointmentBooking';
import MedicationReminders from '@/components/patient/MedicationReminders';
import HealthTips from '@/components/patient/HealthTips';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const PatientDashboard = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [pastQueries, setPastQueries] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<string | null>(null);
  const [suggestedSpecialties, setSuggestedSpecialties] = useState<string[] | null>(null);
  const [recommendedHospitals, setRecommendedHospitals] = useState<any[] | null>(null);
  const [loadingQueries, setLoadingQueries] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingMedications, setLoadingMedications] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPastQueries();
      fetchAppointments();
      fetchMedications();
    }
  }, [user]);

  const fetchPastQueries = async () => {
    setLoadingQueries(true);
    try {
      const { data, error } = await supabase
        .from('health_queries')
        .select('*')
        .eq('patient_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPastQueries(data || []);
    } catch (error) {
      console.error('Error fetching past queries:', error);
    } finally {
      setLoadingQueries(false);
    }
  };

  const fetchAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctor_id(
            id,
            first_name,
            last_name
          )
        `)
        .eq('patient_id', user?.id)
        .order('date', { ascending: true });
      
      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const fetchMedications = async () => {
    setLoadingMedications(true);
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMedications(data || []);
    } catch (error) {
      console.error('Error fetching medications:', error);
    } finally {
      setLoadingMedications(false);
    }
  };

  const handleQuerySubmitted = (queryData: any) => {
    // Update the UI with the new query
    setPastQueries([queryData, ...pastQueries]);
    setCurrentAssessment(queryData.ai_assessment);
    setSuggestedSpecialties(queryData.suggestedSpecialties);
    setRecommendedHospitals(queryData.recommendedHospitals);
    // Switch to the assessment tab
    setActiveTab('assessment');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-20 pb-16">
        <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Patient Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {profile?.first_name || 'Patient'}
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-2">
              <Button className="rounded-full" variant="outline" onClick={() => setActiveTab('appointments')}>
                <Calendar className="h-4 w-4 mr-2" />
                Book Appointment
              </Button>
              <Button className="rounded-full" asChild>
                <a href="#health-query">New Health Query</a>
              </Button>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="w-full md:w-auto rounded-full p-1 bg-muted/50">
              <TabsTrigger value="overview" className="rounded-full">
                Overview
              </TabsTrigger>
              <TabsTrigger value="assessment" className="rounded-full">
                Health Assessment
              </TabsTrigger>
              <TabsTrigger value="appointments" className="rounded-full">
                Appointments
              </TabsTrigger>
              <TabsTrigger value="medications" className="rounded-full">
                Medications
              </TabsTrigger>
              <TabsTrigger value="tips" className="rounded-full">
                Health Tips
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-full">
                History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Recent Assessment</h2>
                    <Pill className="h-5 w-5 text-primary" />
                  </div>
                  
                  {loadingQueries ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : pastQueries.length > 0 ? (
                    <>
                      <p className="text-sm line-clamp-3 mb-2">{pastQueries[0].ai_assessment}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(pastQueries[0].created_at)}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4 w-full rounded-full"
                        onClick={() => {
                          setCurrentAssessment(pastQueries[0].ai_assessment);
                          setActiveTab('assessment');
                        }}
                      >
                        View Details
                      </Button>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No health assessments yet</p>
                  )}
                </Card>
                
                <Card className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Upcoming Appointment</h2>
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  
                  {loadingAppointments ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : appointments.length > 0 ? (
                    <>
                      <p className="font-medium mb-1">
                        Dr. {appointments[0].doctor.first_name} {appointments[0].doctor.last_name}
                      </p>
                      <div className="flex items-center text-sm text-muted-foreground mb-1">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(appointments[0].date).toLocaleString()}
                      </div>
                      <p className="text-sm mt-2">{appointments[0].reason}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4 w-full rounded-full"
                        onClick={() => setActiveTab('appointments')}
                      >
                        View All Appointments
                      </Button>
                    </>
                  ) : (
                    <div>
                      <p className="text-muted-foreground mb-4">No upcoming appointments</p>
                      <Button 
                        size="sm" 
                        className="w-full rounded-full"
                        onClick={() => setActiveTab('appointments')}
                      >
                        Book Appointment
                      </Button>
                    </div>
                  )}
                </Card>
                
                <Card className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Medication Reminder</h2>
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  
                  {loadingMedications ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : medications && medications.length > 0 ? (
                    <>
                      <p className="font-medium">{medications[0].name}</p>
                      <p className="text-sm text-muted-foreground">
                        {medications[0].dosage} - {medications[0].time}
                      </p>
                      {medications.length > 1 && (
                        <p className="text-xs mt-2 text-muted-foreground">
                          +{medications.length - 1} more medications
                        </p>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4 w-full rounded-full"
                        onClick={() => setActiveTab('medications')}
                      >
                        Manage Medications
                      </Button>
                    </>
                  ) : (
                    <div>
                      <p className="text-muted-foreground mb-4">No medication reminders</p>
                      <Button 
                        size="sm" 
                        className="w-full rounded-full"
                        onClick={() => setActiveTab('medications')}
                      >
                        Add Medication
                      </Button>
                    </div>
                  )}
                </Card>
              </div>
              
              <HealthTips />
              
              <div id="health-query">
                <HealthQueryForm onQuerySubmitted={handleQuerySubmitted} />
              </div>
            </TabsContent>
            
            <TabsContent value="assessment" className="space-y-6">
              <div className="space-y-6">
                <HealthAssessment 
                  assessment={currentAssessment}
                  suggestedSpecialties={suggestedSpecialties}
                  recommendedHospitals={recommendedHospitals}
                />
                
                <DoctorRecommendations 
                  suggestedSpecialties={suggestedSpecialties}
                />
                
                <div>
                  <HealthQueryForm onQuerySubmitted={handleQuerySubmitted} />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="appointments" className="space-y-6">
              <AppointmentBooking onAppointmentCreated={fetchAppointments} />
              
              <Card className="glass-card p-6">
                <h2 className="text-xl font-semibold mb-4">Your Appointments</h2>
                
                {loadingAppointments ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">Loading appointments...</p>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">No appointments scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="border rounded-lg p-4 bg-card/50">
                        <div className="flex justify-between">
                          <div>
                            <h3 className="font-medium">
                              Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                            </h3>
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(appointment.date).toLocaleDateString()}
                              <Clock className="h-4 w-4 ml-3 mr-1" />
                              {new Date(appointment.date).toLocaleTimeString()}
                            </div>
                            {appointment.reason && (
                              <p className="mt-2 text-sm">{appointment.reason}</p>
                            )}
                          </div>
                          <div className="flex items-start">
                            <Badge status={appointment.status} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="medications" className="space-y-6">
              <MedicationReminders />
            </TabsContent>
            
            <TabsContent value="tips" className="space-y-6">
              <HealthTips />
            </TabsContent>
            
            <TabsContent value="history" className="space-y-6">
              <Card className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Health Query History</h2>
                  <History className="h-5 w-5 text-primary" />
                </div>
                
                {loadingQueries ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">Loading history...</p>
                  </div>
                ) : pastQueries.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">No health queries yet</p>
                    <Button 
                      className="rounded-full"
                      onClick={() => setActiveTab('overview')}
                    >
                      Create Health Query
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pastQueries.map((query) => (
                      <div key={query.id} className="border rounded-lg p-4 bg-card/50">
                        <p className="text-sm font-medium mb-2">{query.query_text}</p>
                        <div className="border-l-4 border-primary pl-3 py-1 mb-2">
                          <p className="text-xs">{query.ai_assessment}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(query.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

// Badge component for appointment status
const Badge = ({ status }: { status: string }) => {
  let color = '';
  
  switch (status) {
    case 'scheduled':
      color = 'bg-blue-100 text-blue-800';
      break;
    case 'completed':
      color = 'bg-green-100 text-green-800';
      break;
    case 'cancelled':
      color = 'bg-red-100 text-red-800';
      break;
    case 'pending':
      color = 'bg-yellow-100 text-yellow-800';
      break;
    default:
      color = 'bg-gray-100 text-gray-800';
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default PatientDashboard;
