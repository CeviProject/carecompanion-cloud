
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';

const formSchema = z.object({
  doctor_id: z.string({
    required_error: "Please select a doctor",
  }),
  date: z.date({
    required_error: "Please select a date",
  }),
  time: z.string({
    required_error: "Please select a time",
  }),
  reason: z.string().min(5, "Reason must be at least 5 characters").max(500, "Reason must be less than 500 characters"),
});

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00"
];

interface AppointmentBookingProps {
  onAppointmentCreated?: () => void;
}

const AppointmentBooking = ({ onAppointmentCreated }: AppointmentBookingProps) => {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDoctors, setFetchingDoctors] = useState(true);
  const [availableSlots, setAvailableSlots] = useState<string[]>(timeSlots);
  const [appointments, setAppointments] = useState<any[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: "",
    },
  });

  // Fetch doctors when component mounts
  useEffect(() => {
    fetchDoctors();
    
    if (user) {
      fetchUserAppointments();
      
      // Set up real-time subscription for appointments
      const channel = supabase
        .channel('appointments-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'appointments',
            filter: `patient_id=eq.${user.id}`
          },
          (payload) => {
            // Add the new appointment to the state
            setAppointments(prev => [...prev, payload.new]);
            
            // Send a notification about the new appointment
            sendAppointmentNotification(payload.new);
            
            // Update the UI
            toast.success('New appointment booked!');
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'appointments',
            filter: `patient_id=eq.${user.id}`
          },
          (payload) => {
            // Update the appointment in the state
            setAppointments(prev => 
              prev.map(appt => appt.id === payload.new.id ? payload.new : appt)
            );
            
            // Send a notification about the updated appointment
            if (payload.new.status === 'confirmed') {
              sendAppointmentNotification(payload.new, 'confirmed');
            } else if (payload.new.status === 'cancelled') {
              sendAppointmentNotification(payload.new, 'cancelled');
            }
            
            // Update the UI
            toast.info(`Appointment ${payload.new.status}`);
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchUserAppointments = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor_profiles!inner(*)
        `)
        .eq('patient_id', user.id)
        .order('date', { ascending: true });
        
      if (error) throw error;
      
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_profiles')
        .select(`
          id,
          specialty,
          availability,
          profiles:id(
            id,
            first_name,
            last_name
          )
        `);
      
      if (error) throw error;
      
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to load doctors');
    } finally {
      setFetchingDoctors(false);
    }
  };

  const checkAvailability = async (doctorId: string, date: Date) => {
    const selectedDate = format(date, 'yyyy-MM-dd');
    
    try {
      // Get doctor's general availability
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctor_profiles')
        .select('availability')
        .eq('id', doctorId)
        .single();
      
      if (doctorError) throw doctorError;
      
      // Get existing appointments for this doctor on this date
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('date')
        .eq('doctor_id', doctorId)
        .gte('date', `${selectedDate}T00:00:00`)
        .lte('date', `${selectedDate}T23:59:59`);
      
      if (appointmentsError) throw appointmentsError;
      
      // Get day of week
      const dayOfWeek = format(date, 'EEEE').toLowerCase();
      
      // Filter available slots based on doctor's availability and existing appointments
      let available = [...timeSlots];
      
      // Filter based on doctor's weekly schedule
      if (doctorData?.availability && doctorData.availability[dayOfWeek]) {
        const doctorHours = doctorData.availability[dayOfWeek];
        if (doctorHours.length === 0) {
          available = []; // Doctor not available on this day
        } else {
          // Here we'd filter based on doctor's hours, but for simplicity we'll keep the default slots
        }
      }
      
      // Filter out already booked slots
      if (appointments && appointments.length > 0) {
        const bookedTimes = appointments.map(appt => {
          const apptDate = new Date(appt.date);
          return format(apptDate, 'HH:mm');
        });
        
        available = available.filter(slot => !bookedTimes.includes(slot));
      }
      
      setAvailableSlots(available);
    } catch (error) {
      console.error('Error checking availability:', error);
      toast.error('Failed to check doctor availability');
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast.error('You must be logged in to book an appointment');
      return;
    }
    
    setLoading(true);
    
    try {
      // Format date and time for database
      const appointmentDate = new Date(values.date);
      const [hours, minutes] = values.time.split(':');
      appointmentDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: user.id,
          doctor_id: values.doctor_id,
          date: appointmentDate.toISOString(),
          reason: values.reason,
          status: 'scheduled'
        })
        .select();
      
      if (error) throw error;
      
      toast.success('Appointment booked successfully!');
      form.reset();
      
      // Add to Google Calendar if integration is enabled
      const calendarEnabled = localStorage.getItem('googleCalendarEnabled') === 'true';
      if (calendarEnabled) {
        try {
          await addToGoogleCalendar({
            summary: `Medical Appointment`,
            description: values.reason,
            startTime: appointmentDate.toISOString(),
            endTime: new Date(appointmentDate.getTime() + 30 * 60000).toISOString() // 30 min appointment
          });
          toast.success('Added to Google Calendar');
        } catch (calendarError) {
          console.error('Failed to add to Google Calendar:', calendarError);
          toast.error('Failed to add to Google Calendar');
        }
      }
      
      // Send a notification email
      await sendEmailNotification({
        type: 'appointment_reminder',
        recipient: user.email || '',
        message: 'Your appointment has been scheduled successfully.',
        data: {
          appointmentDate: format(appointmentDate, 'PPpp'),
          doctorName: doctors.find(d => d.id === values.doctor_id)?.profiles.first_name + ' ' + 
                    doctors.find(d => d.id === values.doctor_id)?.profiles.last_name
        }
      });
      
      // Callback when appointment is created
      if (onAppointmentCreated) {
        onAppointmentCreated();
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error('Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to send a notification about an appointment
  const sendAppointmentNotification = async (appointment: any, type: 'new' | 'confirmed' | 'cancelled' = 'new') => {
    if (!user?.email) return;
    
    try {
      const doctor = doctors.find(d => d.id === appointment.doctor_id);
      if (!doctor) return;
      
      const doctorName = `${doctor.profiles.first_name} ${doctor.profiles.last_name}`;
      const appointmentDate = format(new Date(appointment.date), 'PPpp');
      
      let subject = '';
      let message = '';
      
      switch (type) {
        case 'new':
          subject = 'New Appointment Scheduled';
          message = `You have scheduled an appointment with Dr. ${doctorName} on ${appointmentDate}.`;
          break;
        case 'confirmed':
          subject = 'Appointment Confirmed';
          message = `Your appointment with Dr. ${doctorName} on ${appointmentDate} has been confirmed.`;
          break;
        case 'cancelled':
          subject = 'Appointment Cancelled';
          message = `Your appointment with Dr. ${doctorName} on ${appointmentDate} has been cancelled.`;
          break;
      }
      
      await sendEmailNotification({
        type: 'appointment_reminder',
        recipient: user.email,
        message,
        subject,
        data: {
          appointmentDate,
          doctorName
        }
      });
    } catch (error) {
      console.error('Error sending appointment notification:', error);
    }
  };

  // Helper function to send email notification
  const sendEmailNotification = async (notificationData: {
    type: string;
    recipient: string;
    message: string;
    subject?: string;
    data?: any;
  }) => {
    try {
      const response = await supabase.functions.invoke('send-notification', {
        body: notificationData
      });
      
      if (response.error) throw new Error(response.error.message);
      
      return response.data;
    } catch (error) {
      console.error('Error sending email notification:', error);
      throw error;
    }
  };

  // Helper function to add to Google Calendar
  const addToGoogleCalendar = async (event: {
    summary: string;
    description: string;
    startTime: string;
    endTime: string;
  }) => {
    try {
      const response = await supabase.functions.invoke('google-calendar-event', {
        body: { event }
      });
      
      if (response.error) throw new Error(response.error.message);
      
      return response.data;
    } catch (error) {
      console.error('Error adding to Google Calendar:', error);
      throw error;
    }
  };

  return (
    <Card className="glass-card p-6">
      <h2 className="text-xl font-semibold mb-6">Book an Appointment</h2>
      
      {fetchingDoctors ? (
        <p className="text-center py-4 text-muted-foreground">Loading doctors...</p>
      ) : doctors.length === 0 ? (
        <p className="text-center py-4 text-muted-foreground">No doctors available at the moment</p>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="doctor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Doctor</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      const date = form.getValues('date');
                      if (date) {
                        checkAvailability(value, date);
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          Dr. {doctor.profiles.first_name} {doctor.profiles.last_name} ({doctor.specialty})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Appointment Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className="w-full pl-3 text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            const doctorId = form.getValues('doctor_id');
                            if (date && doctorId) {
                              checkAvailability(doctorId, date);
                            }
                          }}
                          disabled={(date) => {
                            // Disable past dates
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            
                            // Disable weekends (optional)
                            const day = date.getDay();
                            const isWeekend = day === 0 || day === 6;
                            
                            return date < today || isWeekend;
                          }}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appointment Time</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableSlots.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No available slots
                          </SelectItem>
                        ) : (
                          availableSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              <div className="flex items-center">
                                <Clock className="mr-2 h-4 w-4" />
                                {slot}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Visit</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Please describe your symptoms or reason for the appointment"
                      className="resize-none h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center space-x-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Booking...' : 'Book Appointment'}
              </Button>
              <GoogleCalendarToggle />
            </div>
          </form>
        </Form>
      )}
    </Card>
  );
};

// Google Calendar integration toggle
const GoogleCalendarToggle = () => {
  const [enabled, setEnabled] = useState(() => 
    localStorage.getItem('googleCalendarEnabled') === 'true'
  );
  
  const toggleCalendar = () => {
    const newState = !enabled;
    setEnabled(newState);
    localStorage.setItem('googleCalendarEnabled', newState.toString());
    
    if (newState) {
      // Redirect to Google auth
      redirectToGoogleAuth();
    } else {
      toast.info('Google Calendar integration disabled');
    }
  };
  
  const redirectToGoogleAuth = () => {
    // This function would redirect to the Google OAuth flow
    // For now, just show a toast message
    toast.info('Google Calendar authorization required');
    // Full implementation would require Google OAuth setup
  };
  
  return (
    <Button 
      variant="outline" 
      type="button"
      onClick={toggleCalendar}
      className={enabled ? "bg-green-50" : ""}
    >
      {enabled ? "Calendar On" : "Calendar Off"}
    </Button>
  );
};

export default AppointmentBooking;
