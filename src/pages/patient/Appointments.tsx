
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import AppointmentBooking from '@/components/patient/AppointmentBooking';
import PatientNavbar from '@/components/patient/PatientNavbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Clock, User, MapPin, ChevronRight, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const PatientAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor_profiles!inner(
            *,
            profiles:id(
              first_name,
              last_name
            )
          )
        `)
        .eq('patient_id', user?.id || '')
        .order('date', { ascending: true });

      if (error) throw error;
      
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId)
        .eq('patient_id', user?.id);

      if (error) throw error;
      
      toast.success('Appointment cancelled successfully');
      fetchAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-500">Scheduled</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case 'completed':
        return <Badge className="bg-purple-500">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Appointments</h1>
          <p className="text-xl text-muted-foreground mt-2">
            Schedule and manage your healthcare appointments.
          </p>
        </div>
        
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="mb-6 text-lg">
            <TabsTrigger value="upcoming" className="px-6 py-3">Book Appointment</TabsTrigger>
            <TabsTrigger value="history" className="px-6 py-3">My Appointments</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming">
            <Card className="shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-primary">
              <CardContent className="p-6 md:p-8">
                <AppointmentBooking onAppointmentCreated={fetchAppointments} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history">
            <Card className="shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-primary">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-xl font-semibold mb-6">My Appointments</h2>
                
                {loading ? (
                  <div className="text-center py-12">
                    <p className="text-lg text-muted-foreground">Loading appointments...</p>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg border-dashed">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No appointments found</p>
                    <p className="text-muted-foreground mt-1">You haven't scheduled any appointments yet.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {appointments.map((appointment) => {
                      const appointmentDate = new Date(appointment.date);
                      const doctorName = `Dr. ${appointment.doctor_profiles.profiles.first_name} ${appointment.doctor_profiles.profiles.last_name}`;
                      const isPast = appointmentDate < new Date();
                      const isCancelled = appointment.status === 'cancelled';
                      
                      return (
                        <div 
                          key={appointment.id} 
                          className={`border rounded-lg p-5 transition-all ${
                            isPast || isCancelled ? 'bg-muted/30' : 'bg-card hover:shadow-md'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div className="flex-1">
                              <div className="flex items-start gap-3">
                                <div className="flex flex-col">
                                  <span className="text-lg font-medium">{doctorName}</span>
                                  <span className="text-muted-foreground">{appointment.doctor_profiles.specialty}</span>
                                </div>
                                <div className="ml-auto md:hidden">
                                  {getStatusBadge(appointment.status)}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-4">
                                <div className="flex items-center text-base">
                                  <Calendar className="mr-2 h-5 w-5 text-muted-foreground" />
                                  <span>{format(appointmentDate, 'EEEE, MMMM do, yyyy')}</span>
                                </div>
                                <div className="flex items-center text-base">
                                  <Clock className="mr-2 h-5 w-5 text-muted-foreground" />
                                  <span>{format(appointmentDate, 'h:mm a')}</span>
                                </div>
                                {appointment.doctor_profiles.location && (
                                  <div className="flex items-center text-base sm:col-span-2">
                                    <MapPin className="mr-2 h-5 w-5 text-muted-foreground" />
                                    <span>{appointment.doctor_profiles.location}</span>
                                  </div>
                                )}
                              </div>
                              
                              {appointment.reason && (
                                <div className="mt-4">
                                  <Separator className="my-2" />
                                  <p className="text-sm text-muted-foreground mt-2">
                                    <span className="font-medium text-foreground">Reason for visit: </span>
                                    {appointment.reason}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="hidden md:flex md:flex-col md:items-end md:ml-6 md:min-w-[120px]">
                              {getStatusBadge(appointment.status)}
                              
                              {!isPast && !isCancelled && appointment.status !== 'completed' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="mt-3"
                                  onClick={() => cancelAppointment(appointment.id)}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Mobile action buttons */}
                          {!isPast && !isCancelled && appointment.status !== 'completed' && (
                            <div className="mt-4 flex justify-end md:hidden">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => cancelAppointment(appointment.id)}
                              >
                                Cancel Appointment
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PatientAppointments;
