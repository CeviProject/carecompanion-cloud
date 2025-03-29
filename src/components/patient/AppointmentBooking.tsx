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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const [isGoogleAuthDialogOpen, setIsGoogleAuthDialogOpen] = useState(false);
  const [googleAuthUrl, setGoogleAuthUrl] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: "",
    },
  });

  useEffect(() => {
    fetchDoctors();
    
    if (user) {
      fetchUserAppointments();
      checkGoogleCalendarAuth();
      
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
            setAppointments(prev => [...prev, payload.new]);
            sendAppointmentNotification(payload.new);
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
            setAppointments(prev => 
              prev.map(appt => appt.id === payload.new.id ? payload.new : appt)
            );
            if (payload.new.status === 'confirmed') {
              sendAppointmentNotification(payload.new, 'confirmed');
            } else if (payload.new.status === 'cancelled') {
              sendAppointmentNotification(payload.new, 'cancelled');
            }
            toast.info(`Appointment ${payload.new.status}`);
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const checkGoogleCalendarAuth = () => {
    const tokens = getGoogleCalendarTokens();
    
    if (tokens?.access_token && tokens?.expires_at) {
      const now = Date.now();
      const expiresAt = tokens.expires_at;
      
      if (now >= expiresAt) {
        if (tokens.refresh_token) {
          refreshGoogleToken(tokens.refresh_token);
        } else {
          localStorage.removeItem('googleCalendarTokens');
          localStorage.setItem('googleCalendarEnabled', 'false');
        }
      }
    }
  };

  const getGoogleCalendarTokens = () => {
    const tokensStr = localStorage.getItem('googleCalendarTokens');
    if (!tokensStr) return null;
    
    try {
      return JSON.parse(tokensStr);
    } catch (err) {
      console.error('Error parsing Google Calendar tokens:', err);
      return null;
    }
  };
  
  const saveGoogleCalendarTokens = (tokens: any) => {
    const expiresAt = Date.now() + (tokens.expires_in * 1000);
    const tokensToSave = {
      ...tokens,
      expires_at: expiresAt
    };
    
    localStorage.setItem('googleCalendarTokens', JSON.stringify(tokensToSave));
    localStorage.setItem('googleCalendarEnabled', 'true');
  };

  const refreshGoogleToken = async (refreshToken: string) => {
    try {
      const response = await supabase.functions.invoke('google-calendar-event', {
        body: { 
          refresh_token: refreshToken,
          action: 'refresh' 
        }
      });
      
      if (response.error) throw new Error(response.error.message);
      
      if (response.data.access_token) {
        const currentTokens = getGoogleCalendarTokens();
        saveGoogleCalendarTokens({
          ...currentTokens,
          access_token: response.data.access_token,
          expires_in: response.data.expires_in
        });
        
        return response.data.access_token;
      }
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      localStorage.removeItem('googleCalendarTokens');
      localStorage.setItem('googleCalendarEnabled', 'false');
      return null;
    }
  };

  const handleGoogleAuthorize = async () => {
    try {
      console.log('Requesting Google authorization URL');
      const response = await supabase.functions.invoke('google-calendar-event', {
        body: { action: 'authorize' }
      });
      
      if (response.error) {
        console.error('Authorization error:', response.error);
        throw new Error(response.error.message);
      }
      
      if (response.data?.authUrl) {
        console.log('Received auth URL:', response.data.authUrl);
        setGoogleAuthUrl(response.data.authUrl);
        setIsGoogleAuthDialogOpen(true);
      } else {
        console.error('No auth URL in response:', response);
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Error getting Google auth URL:', error);
      toast.error('Failed to start Google Calendar authorization');
    }
  };

  const handleGoogleAuthCallback = async (code: string) => {
    try {
      console.log('Exchanging authorization code for tokens');
      const response = await supabase.functions.invoke('google-calendar-event', {
        body: { 
          code,
          action: 'token'
        }
      });
      
      if (response.error) {
        console.error('Token exchange error:', response.error);
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        console.log('Received tokens successfully');
        saveGoogleCalendarTokens(response.data);
        toast.success('Google Calendar connected successfully');
        setIsGoogleAuthDialogOpen(false);
      } else {
        console.error('No token data in response:', response);
        throw new Error('Failed to exchange code for tokens');
      }
    } catch (error) {
      console.error('Error exchanging Google auth code:', error);
      toast.error('Failed to connect Google Calendar');
    }
  };

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
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctor_profiles')
        .select('availability')
        .eq('id', doctorId)
        .single();
      
      if (doctorError) throw doctorError;
      
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('date')
        .eq('doctor_id', doctorId)
        .gte('date', `${selectedDate}T00:00:00`)
        .lte('date', `${selectedDate}T23:59:59`);
      
      if (appointmentsError) throw appointmentsError;
      
      const dayOfWeek = format(date, 'EEEE').toLowerCase();
      
      let available = [...timeSlots];
      
      if (doctorData?.availability && doctorData.availability[dayOfWeek]) {
        const doctorHours = doctorData.availability[dayOfWeek];
        if (doctorHours.length === 0) {
          available = [];
        } else {
        }
      }
      
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
      
      const isGoogleCalendarEnabled = localStorage.getItem('googleCalendarEnabled') === 'true';
      if (isGoogleCalendarEnabled) {
        const tokens = getGoogleCalendarTokens();
        if (tokens?.access_token) {
          try {
            const doctor = doctors.find(d => d.id === values.doctor_id);
            const doctorName = doctor ? 
              `Dr. ${doctor.profiles.first_name} ${doctor.profiles.last_name}` : 
              'Doctor';
            
            console.log('Adding appointment to Google Calendar');
            await addToGoogleCalendar({
              summary: `Medical Appointment with ${doctorName}`,
              description: values.reason,
              startTime: appointmentDate.toISOString(),
              endTime: new Date(appointmentDate.getTime() + 30 * 60000).toISOString(),
              accessToken: tokens.access_token
            });
            toast.success('Added to Google Calendar');
          } catch (calendarError: any) {
            console.error('Failed to add to Google Calendar:', calendarError);
            
            if ((calendarError.message?.includes('401') || calendarError.message?.includes('invalid_token')) && tokens.refresh_token) {
              console.log('Token expired, attempting to refresh');
              const newToken = await refreshGoogleToken(tokens.refresh_token);
              if (newToken) {
                try {
                  await addToGoogleCalendar({
                    summary: `Medical Appointment`,
                    description: values.reason,
                    startTime: appointmentDate.toISOString(),
                    endTime: new Date(appointmentDate.getTime() + 30 * 60000).toISOString(),
                    accessToken: newToken
                  });
                  toast.success('Added to Google Calendar');
                } catch (retryError) {
                  console.error('Failed to add to Google Calendar after token refresh:', retryError);
                  toast.error('Failed to add to Google Calendar');
                }
              } else {
                toast.error('Failed to refresh Google Calendar access. Please reconnect.');
              }
            } else {
              toast.error('Failed to add to Google Calendar');
            }
          }
        } else {
          toast.warning('Google Calendar is enabled but no access token found. Please reconnect.');
        }
      }
      
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

  const addToGoogleCalendar = async (event: {
    summary: string;
    description: string;
    startTime: string;
    endTime: string;
    accessToken: string;
  }) => {
    try {
      console.log('Invoking Google Calendar edge function to create event', {
        summary: event.summary,
        startTime: event.startTime,
        endTime: event.endTime
      });
      
      const response = await supabase.functions.invoke('google-calendar-event', {
        body: { 
          action: 'create',
          event: {
            summary: event.summary,
            description: event.description,
            startTime: event.startTime,
            endTime: event.endTime
          }, 
          accessToken: event.accessToken
        }
      });
      
      if (response.error) {
        console.error('Error invoking Google Calendar function:', response.error);
        throw new Error(response.error.message);
      }
      
      console.log('Response from Google Calendar function:', response.data);
      
      if (!response.data || !response.data.success) {
        console.error('Error from Google Calendar function:', response.data?.error || 'Unknown error');
        throw new Error(response.data?.error || 'Failed to create calendar event');
      }
      
      console.log('Event created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error adding to Google Calendar:', error);
      throw error;
    }
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    
    if (code && state === 'google_calendar_auth') {
      console.log('OAuth callback detected, processing code');
      window.history.replaceState({}, document.title, window.location.pathname);
      handleGoogleAuthCallback(code);
    }
  }, []);

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
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            
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
              <GoogleCalendarToggle onAuthorize={handleGoogleAuthorize} />
            </div>
          </form>
        </Form>
      )}
      
      <Dialog open={isGoogleAuthDialogOpen} onOpenChange={setIsGoogleAuthDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect to Google Calendar</DialogTitle>
            <DialogDescription>
              You'll be redirected to Google to authorize access to your calendar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">
              This will allow the app to:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>View your calendars</li>
              <li>Create events in your primary calendar</li>
              <li>Send reminders for your appointments</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              You will be redirected to Google's authorization page.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsGoogleAuthDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              window.location.href = googleAuthUrl;
            }}>
              Continue to Google
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const GoogleCalendarToggle = ({ onAuthorize }: { onAuthorize: () => void }) => {
  const [enabled, setEnabled] = useState(() => 
    localStorage.getItem('googleCalendarEnabled') === 'true'
  );
  
  const toggleCalendar = () => {
    const newState = !enabled;
    setEnabled(newState);
    localStorage.setItem('googleCalendarEnabled', String(newState));
    
    if (newState) {
      onAuthorize();
    } else {
      localStorage.removeItem('googleCalendarTokens');
      toast.info('Google Calendar integration disabled');
    }
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
