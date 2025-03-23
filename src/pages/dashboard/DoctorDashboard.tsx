
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, User, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProfileManager from '@/components/doctor/ProfileManager';
import AvailabilityManager from '@/components/doctor/AvailabilityManager';
import AppointmentList from '@/components/doctor/AppointmentList';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const DoctorDashboard = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [doctorStats, setDoctorStats] = useState({
    completedAppointments: 0,
    patientSatisfaction: '4.9/5',
    responseTime: '1.2 hrs'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTodayAppointments();
      fetchDoctorStats();
      
      // Set up real-time subscription for appointments
      const appointmentsChannel = supabase
        .channel('appointments-changes')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'appointments',
            filter: `doctor_id=eq.${user.id}`
          },
          () => {
            // Refresh the data when changes occur
            fetchTodayAppointments();
            fetchDoctorStats();
          }
        )
        .subscribe();
        
      // Cleanup subscription on unmount
      return () => {
        supabase.removeChannel(appointmentsChannel);
      };
    }
  }, [user]);

  const fetchTodayAppointments = async () => {
    if (!user) return;
    
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles:patient_id(
            first_name,
            last_name
          )
        `)
        .eq('doctor_id', user.id)
        .gte('date', startOfDay)
        .lte('date', endOfDay)
        .order('date', { ascending: true });
        
      if (error) throw error;
      
      setTodayAppointments(data || []);
    } catch (error) {
      console.error('Error fetching today\'s appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorStats = async () => {
    if (!user) return;
    
    try {
      // Get completed appointments count
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', user.id)
        .eq('status', 'completed');
        
      if (error) throw error;
      
      setDoctorStats(prev => ({
        ...prev,
        completedAppointments: count || 0
      }));
    } catch (error) {
      console.error('Error fetching doctor stats:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-20 pb-16">
        <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Doctor Dashboard</h1>
            <p className="text-xl text-muted-foreground">
              Welcome back, Dr. {profile?.last_name || 'Doctor'}
            </p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="w-full md:w-auto rounded-full p-1 bg-muted/50">
              <TabsTrigger value="overview" className="rounded-full text-lg py-2 px-6">
                Overview
              </TabsTrigger>
              <TabsTrigger value="appointments" className="rounded-full text-lg py-2 px-6">
                Appointments
              </TabsTrigger>
              <TabsTrigger value="availability" className="rounded-full text-lg py-2 px-6">
                Availability
              </TabsTrigger>
              <TabsTrigger value="profile" className="rounded-full text-lg py-2 px-6">
                Profile
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Today's Schedule</h2>
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  
                  {loading ? (
                    <div className="py-6 text-center">
                      <p className="text-muted-foreground">Loading today's appointments...</p>
                    </div>
                  ) : todayAppointments.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-muted-foreground">No appointments scheduled for today.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {todayAppointments.map((appointment) => (
                        <div key={appointment.id} className="flex justify-between items-center border-b pb-3">
                          <div>
                            <p className="font-medium text-lg">
                              {format(new Date(appointment.date), 'h:mm a')}
                            </p>
                            <p className="text-base text-muted-foreground">
                              {appointment.profiles.first_name} {appointment.profiles.last_name}
                            </p>
                            {appointment.reason && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {appointment.reason}
                              </p>
                            )}
                          </div>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {appointment.status || 'Scheduled'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
                
                <Card className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Your Metrics</h2>
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-base text-muted-foreground">Completed Appointments</p>
                      <p className="text-2xl font-semibold">{doctorStats.completedAppointments}</p>
                    </div>
                    
                    <div>
                      <p className="text-base text-muted-foreground">Patient Satisfaction</p>
                      <p className="text-2xl font-semibold">{doctorStats.patientSatisfaction}</p>
                    </div>
                    
                    <div>
                      <p className="text-base text-muted-foreground">Response Time</p>
                      <p className="text-2xl font-semibold">{doctorStats.responseTime}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Quick Actions</h2>
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div className="space-y-3">
                    <button 
                      className="w-full text-left px-3 py-3 rounded-md hover:bg-muted/50 transition-colors text-lg"
                      onClick={() => setActiveTab('appointments')}
                    >
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 mr-3" />
                        <span>View Appointments</span>
                      </div>
                    </button>
                    
                    <button 
                      className="w-full text-left px-3 py-3 rounded-md hover:bg-muted/50 transition-colors text-lg"
                      onClick={() => setActiveTab('availability')}
                    >
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 mr-3" />
                        <span>Update Availability</span>
                      </div>
                    </button>
                    
                    <button 
                      className="w-full text-left px-3 py-3 rounded-md hover:bg-muted/50 transition-colors text-lg"
                      onClick={() => setActiveTab('profile')}
                    >
                      <div className="flex items-center">
                        <User className="h-5 w-5 mr-3" />
                        <span>Edit Profile</span>
                      </div>
                    </button>
                  </div>
                </Card>
              </div>
              
              <AppointmentList />
            </TabsContent>
            
            <TabsContent value="appointments" className="space-y-6">
              <AppointmentList />
            </TabsContent>
            
            <TabsContent value="availability" className="space-y-6">
              <AvailabilityManager />
            </TabsContent>
            
            <TabsContent value="profile" className="space-y-6">
              <ProfileManager />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default DoctorDashboard;
