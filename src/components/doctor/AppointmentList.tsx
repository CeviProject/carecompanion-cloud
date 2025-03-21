
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, User, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Appointment {
  id: string;
  date: string;
  status: string;
  reason: string | null;
  patient: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

const AppointmentList = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  const fetchAppointments = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patient_id(
            id,
            first_name,
            last_name
          )
        `)
        .eq('doctor_id', user.id)
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

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setAppointments(prev => 
        prev.map(appt => appt.id === id ? { ...appt, status } : appt)
      );
      
      toast.success(`Appointment marked as ${status}`);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('Failed to update appointment status');
    }
  };

  if (loading) {
    return (
      <Card className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-4">Your Appointments</h2>
        <div className="py-8 text-center">
          <p className="text-muted-foreground">Loading appointments...</p>
        </div>
      </Card>
    );
  }

  // Group appointments by date
  const groupedAppointments: Record<string, Appointment[]> = {};
  
  appointments.forEach((appointment) => {
    const date = new Date(appointment.date).toLocaleDateString();
    if (!groupedAppointments[date]) {
      groupedAppointments[date] = [];
    }
    groupedAppointments[date].push(appointment);
  });

  return (
    <Card className="glass-card p-6">
      <h2 className="text-xl font-semibold mb-6">Your Appointments</h2>
      
      {Object.keys(groupedAppointments).length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">No appointments scheduled</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedAppointments).map(([date, appts]) => (
            <div key={date}>
              <div className="flex items-center mb-4">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                <h3 className="font-medium">{date}</h3>
              </div>
              
              <div className="space-y-4">
                {appts.map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-4 bg-card/50">
                    <div className="flex justify-between">
                      <div>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <h4 className="font-medium">
                            {appointment.patient.first_name} {appointment.patient.last_name}
                          </h4>
                        </div>
                        
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(appointment.date).toLocaleTimeString()}
                        </div>
                        
                        {appointment.reason && (
                          <div className="flex items-start mt-2 text-sm">
                            <FileText className="h-4 w-4 mr-1 mt-0.5 text-muted-foreground" />
                            <p>{appointment.reason}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <span className={`px-2 py-1 mb-2 rounded-full text-xs font-medium ${getStatusClass(appointment.status)}`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                        
                        <div className="flex space-x-2">
                          {appointment.status === 'scheduled' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                              >
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// Helper function to get status class
const getStatusClass = (status: string) => {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default AppointmentList;
