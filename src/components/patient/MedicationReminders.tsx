
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Pill, Calendar, Clock, Trash2 } from 'lucide-react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const formSchema = z.object({
  name: z.string().min(2, "Medication name must be at least 2 characters"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string({
    required_error: "Please select frequency",
  }),
  time: z.string({
    required_error: "Please specify time",
  }),
  start_date: z.date({
    required_error: "Start date is required",
  }),
  end_date: z.date().optional(),
  notes: z.string().optional(),
});

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
}

const MedicationReminders = () => {
  const { user } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingMeds, setFetchingMeds] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: "",
    },
  });

  useEffect(() => {
    if (user) {
      fetchMedications();
    }
  }, [user]);

  const fetchMedications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setMedications(data || []);
    } catch (error) {
      console.error('Error fetching medications:', error);
      toast.error('Failed to load medications');
    } finally {
      setFetchingMeds(false);
    }
  };

  const addToGoogleCalendar = async (medication: Medication) => {
    try {
      // Format calendar event based on medication frequency
      const startDate = new Date(medication.start_date);
      const endDate = medication.end_date ? new Date(medication.end_date) : null;
      
      const [hours, minutes] = medication.time.split(':');
      startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      
      let recurrence = null;
      switch (medication.frequency) {
        case 'daily':
          recurrence = 'RRULE:FREQ=DAILY';
          break;
        case 'twice_daily':
          // For twice daily, we'd create two events, but for simplicity
          // we'll just create one and note it's twice daily
          recurrence = 'RRULE:FREQ=DAILY';
          break;
        case 'weekly':
          recurrence = 'RRULE:FREQ=WEEKLY';
          break;
        case 'monthly':
          recurrence = 'RRULE:FREQ=MONTHLY';
          break;
      }
      
      const event = {
        summary: `Take ${medication.name} (${medication.dosage})`,
        description: medication.notes || 'Medication reminder',
        startTime: startDate.toISOString(),
        endTime: new Date(startDate.getTime() + 10 * 60000).toISOString(), // 10 min duration
        recurrence: recurrence,
        endRecurrence: endDate ? endDate.toISOString() : null
      };
      
      await supabase.functions.invoke('google-calendar-event', {
        body: { event }
      });
      
      toast.success('Added medication reminder to Google Calendar');
    } catch (error) {
      console.error('Error adding to Google Calendar:', error);
      toast.error('Failed to add to Google Calendar');
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast.error('You must be logged in to add medications');
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('medications')
        .insert({
          user_id: user.id,
          name: values.name,
          dosage: values.dosage,
          frequency: values.frequency,
          time: values.time,
          start_date: values.start_date.toISOString(),
          end_date: values.end_date ? values.end_date.toISOString() : null,
          notes: values.notes || null
        })
        .select();
      
      if (error) throw error;
      
      toast.success('Medication reminder added successfully!');
      
      // Add new medication to state
      if (data && data.length > 0) {
        setMedications([data[0], ...medications]);
        
        // Add to Google Calendar if integration is enabled
        const calendarEnabled = localStorage.getItem('googleCalendarEnabled') === 'true';
        if (calendarEnabled) {
          await addToGoogleCalendar(data[0]);
        }
      }
      
      form.reset();
    } catch (error) {
      console.error('Error adding medication:', error);
      toast.error('Failed to add medication reminder');
    } finally {
      setLoading(false);
    }
  };

  const deleteMedication = async (id: string) => {
    try {
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setMedications(medications.filter(med => med.id !== id));
      
      toast.success('Medication reminder deleted');
    } catch (error) {
      console.error('Error deleting medication:', error);
      toast.error('Failed to delete medication reminder');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-6">Add Medication Reminder</h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medication Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Aspirin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dosage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dosage</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 100mg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="twice_daily">Twice Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="as_needed">As Needed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
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
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
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
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date (Optional)</FormLabel>
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
                              <span>Pick end date (optional)</span>
                            )}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          disabled={(date) => {
                            const startDate = form.getValues('start_date');
                            if (!startDate) return false;
                            return date < startDate;
                          }}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Additional instructions or notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Adding...' : 'Add Medication Reminder'}
            </Button>
          </form>
        </Form>
      </Card>
      
      <Card className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-6">Your Medications</h2>
        
        {fetchingMeds ? (
          <p className="text-center py-4 text-muted-foreground">Loading medications...</p>
        ) : medications.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">No medication reminders added yet</p>
        ) : (
          <div className="space-y-4">
            {medications.map((medication) => (
              <div key={medication.id} className="border rounded-lg p-4 bg-card/50">
                <div className="flex justify-between">
                  <div>
                    <div className="flex items-start">
                      <Pill className="h-5 w-5 mr-2 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-medium">{medication.name} ({medication.dosage})</h3>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Clock className="h-4 w-4 mr-1" />
                          {medication.time} - {formatFrequency(medication.frequency)}
                        </div>
                        <div className="text-sm mt-1">
                          {format(new Date(medication.start_date), "PPP")} to {medication.end_date 
                            ? format(new Date(medication.end_date), "PPP") 
                            : 'Ongoing'}
                        </div>
                        {medication.notes && (
                          <p className="mt-2 text-sm text-muted-foreground">{medication.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => deleteMedication(medication.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// Helper function to format frequency for display
const formatFrequency = (frequency: string) => {
  switch (frequency) {
    case 'daily':
      return 'Daily';
    case 'twice_daily':
      return 'Twice Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'as_needed':
      return 'As Needed';
    default:
      return frequency;
  }
};

export default MedicationReminders;
