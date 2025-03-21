import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Calendar as CalendarIcon, Clock, Pill, Trash2, Check, RefreshCw } from "lucide-react";
import { format, addDays, isToday } from 'date-fns';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useGoogleCalendar } from '@/context/GoogleCalendarContext';
import { toast } from 'sonner';

interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'twice_daily', label: 'Twice Daily' },
  { value: 'three_times_daily', label: 'Three Times Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'as_needed', label: 'As Needed' },
];

const MedicationReminders = () => {
  const { user } = useAuth();
  const { isEnabled: isGoogleCalendarEnabled, getAccessToken, authorizeGoogleCalendar } = useGoogleCalendar();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
    time: '08:00',
    start_date: new Date(),
    end_date: null as Date | null,
    notes: ''
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isEndDateCalendarOpen, setIsEndDateCalendarOpen] = useState(false);
  const [todaysMedications, setTodaysMedications] = useState<Medication[]>([]);

  useEffect(() => {
    if (user) {
      fetchMedications();
      
      const channel = supabase
        .channel('medications-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'medications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setMedications(prev => [payload.new as Medication, ...prev]);
              checkIfMedicationDueToday(payload.new as Medication);
              toast.success(`Medication "${payload.new.name}" added`);
            } else if (payload.eventType === 'UPDATE') {
              setMedications(prev => 
                prev.map(med => med.id === payload.new.id ? payload.new as Medication : med)
              );
              toast.info(`Medication "${payload.new.name}" updated`);
            } else if (payload.eventType === 'DELETE') {
              setMedications(prev => prev.filter(med => med.id !== payload.old.id));
              toast.info(`Medication removed`);
            }
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    if (medications.length > 0) {
      const todayMeds = filterTodaysMedications(medications);
      setTodaysMedications(todayMeds);
      
      if (todayMeds.length > 0) {
        const checkInterval = setInterval(() => {
          checkMedicationReminders(todayMeds);
        }, 60000);
        
        checkMedicationReminders(todayMeds);
        
        return () => clearInterval(checkInterval);
      }
    }
  }, [medications]);

  const fetchMedications = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setMedications(data as Medication[]);
    } catch (error: any) {
      console.error('Error fetching medications:', error);
      toast.error(`Failed to load medications: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTodaysMedications = (meds: Medication[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return meds.filter(med => {
      const startDate = new Date(med.start_date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = med.end_date ? new Date(med.end_date) : null;
      if (endDate) endDate.setHours(0, 0, 0, 0);
      
      return startDate <= today && (!endDate || endDate >= today);
    });
  };

  const checkIfMedicationDueToday = (medication: Medication) => {
    const startDate = new Date(medication.start_date);
    const today = new Date();
    
    if (isToday(startDate)) {
      setTodaysMedications(prev => [...prev, medication]);
    }
  };

  const checkMedicationReminders = (todayMeds: Medication[]) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    todayMeds.forEach(med => {
      const [medHour, medMinute] = med.time.split(':').map(Number);
      
      if (currentHour === medHour && Math.abs(currentMinute - medMinute) <= 5) {
        toast.warning(
          `Time to take ${med.name} (${med.dosage})`,
          {
            duration: 10000,
            action: {
              label: "Dismiss",
              onClick: () => {}
            }
          }
        );
        
        sendMedicationReminder(med);
      }
    });
  };

  const sendMedicationReminder = async (medication: Medication) => {
    if (!user?.email) return;
    
    try {
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'medication_reminder',
          recipient: user.email,
          message: `Remember to take your medication at ${medication.time}.`,
          data: {
            medicationName: medication.name,
            dosage: medication.dosage,
            time: medication.time
          }
        }
      });
    } catch (error) {
      console.error('Error sending medication reminder:', error);
    }
  };

  const handleAddMedication = async () => {
    try {
      if (!newMedication.name || !newMedication.dosage || !newMedication.time) {
        toast.error('Please fill all required fields');
        return;
      }

      const { data, error } = await supabase
        .from('medications')
        .insert({
          user_id: user?.id,
          name: newMedication.name,
          dosage: newMedication.dosage,
          frequency: newMedication.frequency,
          time: newMedication.time,
          start_date: newMedication.start_date.toISOString(),
          end_date: newMedication.end_date ? newMedication.end_date.toISOString() : null,
          notes: newMedication.notes || null
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Medication saved successfully');
      
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error: any) {
      console.error('Error adding medication:', error);
      toast.error(`Failed to add medication: ${error.message}`);
    }
  };

  const handleDeleteMedication = async (id: string) => {
    try {
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting medication:', error);
      toast.error(`Failed to delete medication: ${error.message}`);
    }
  };

  const syncWithGoogleCalendar = async () => {
    if (!isGoogleCalendarEnabled) {
      toast.info('Google Calendar is not connected');
      authorizeGoogleCalendar();
      return;
    }

    if (medications.length === 0) {
      toast.info('No medications to sync with Google Calendar');
      return;
    }

    try {
      setIsSyncingCalendar(true);
      toast.info('Syncing medications with Google Calendar...');

      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Could not get access token for Google Calendar');
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-calendar-event', {
        body: { 
          action: 'sync_all_medications',
          userId: user?.id,
          accessToken,
          medications
        }
      });

      if (error) {
        console.error('Error in sync_all_medications request:', error);
        toast.error(`Failed to sync: ${error.message}`);
        return;
      }

      console.log('Sync response:', data);
      
      if (data.success) {
        toast.success(`Successfully synced ${data.results?.successful || 0} medications to Google Calendar`);
      } else if (data.results?.failed > 0 && data.results?.successful > 0) {
        toast.warning(`Synced ${data.results.successful} medications, ${data.results.failed} failed`);
      } else {
        toast.error('Failed to sync medications to Google Calendar');
      }
    } catch (error: any) {
      console.error('Error syncing with Google Calendar:', error);
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const syncMedicationToCalendar = async (medication: Medication, accessToken: string) => {
    const eventDetails = {
      summary: `Take ${medication.name} ${medication.dosage}`,
      description: medication.notes || `Remember to take your ${medication.name}. Dosage: ${medication.dosage}`,
      startTime: combineDateTime(new Date(medication.start_date), medication.time),
      endTime: addMinutes(combineDateTime(new Date(medication.start_date), medication.time), 15),
      frequency: medication.frequency,
      endDate: medication.end_date
    };

    const { data, error } = await supabase.functions.invoke('google-calendar-event', {
      body: { 
        action: 'create',
        event: eventDetails,
        accessToken
      }
    });

    if (error || !data.success) {
      console.error('Error syncing medication to Google Calendar:', error || data.error);
      throw new Error(error?.message || data.error || 'Unknown error adding to Google Calendar');
    }
    
    return data;
  };

  const combineDateTime = (date: Date, timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined.toISOString();
  };

  const addMinutes = (dateStr: string, minutes: number) => {
    const date = new Date(dateStr);
    date.setMinutes(date.getMinutes() + minutes);
    return date.toISOString();
  };

  const resetForm = () => {
    setNewMedication({
      name: '',
      dosage: '',
      frequency: 'daily',
      time: '08:00',
      start_date: new Date(),
      end_date: null,
      notes: ''
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Medication Reminders</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={syncWithGoogleCalendar} 
            disabled={isSyncingCalendar}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isSyncingCalendar && "animate-spin")} />
            {isSyncingCalendar ? 'Syncing...' : 'Sync to Google Calendar'}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Medication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Medication</DialogTitle>
                <DialogDescription>
                  Set up reminders for your medications.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Medication Name</Label>
                    <Input 
                      id="name" 
                      placeholder="e.g. Aspirin"
                      value={newMedication.name}
                      onChange={(e) => setNewMedication({...newMedication, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dosage">Dosage</Label>
                    <Input 
                      id="dosage" 
                      placeholder="e.g. 500mg"
                      value={newMedication.dosage}
                      onChange={(e) => setNewMedication({...newMedication, dosage: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select 
                    value={newMedication.frequency}
                    onValueChange={(value) => setNewMedication({...newMedication, frequency: value})}
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="time">Time to Take</Label>
                  <Input 
                    id="time" 
                    type="time"
                    value={newMedication.time}
                    onChange={(e) => setNewMedication({...newMedication, time: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="start_date"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newMedication.start_date ? (
                            format(newMedication.start_date, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newMedication.start_date}
                          onSelect={(date) => {
                            if (date) {
                              setNewMedication({...newMedication, start_date: date});
                              setIsCalendarOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date (Optional)</Label>
                    <Popover open={isEndDateCalendarOpen} onOpenChange={setIsEndDateCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="end_date"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newMedication.end_date ? (
                            format(newMedication.end_date, "PPP")
                          ) : (
                            <span>No end date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <div className="p-2">
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start"
                            onClick={() => {
                              setNewMedication({...newMedication, end_date: null});
                              setIsEndDateCalendarOpen(false);
                            }}
                          >
                            Clear end date
                          </Button>
                        </div>
                        <Calendar
                          mode="single"
                          selected={newMedication.end_date ?? undefined}
                          onSelect={(date) => {
                            setNewMedication({...newMedication, end_date: date});
                            setIsEndDateCalendarOpen(false);
                          }}
                          disabled={(date) => date < addDays(newMedication.start_date, 1)}
                          initialFocus
                          className="border-t"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Any special instructions..."
                    value={newMedication.notes}
                    onChange={(e) => setNewMedication({...newMedication, notes: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  resetForm();
                  setIsAddDialogOpen(false);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleAddMedication}>
                  Add Medication
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-12 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : medications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
            <Pill className="h-12 w-12 text-gray-400" />
            <p className="text-center text-gray-500">No medications found. Add your first medication to get started.</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Medication
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medications.map((med) => (
            <Card key={med.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      <Pill className="h-4 w-4 mr-2 text-blue-500" />
                      {med.name}
                    </CardTitle>
                    <p className="text-sm font-medium mt-1">{med.dosage}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => handleDeleteMedication(med.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-gray-500" />
                    <span>
                      {med.frequency.replace(/_/g, ' ')} at {formatTime(med.time)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                    <span>
                      From {formatDate(med.start_date)}
                      {med.end_date ? ` to ${formatDate(med.end_date)}` : ''}
                    </span>
                  </div>
                  {med.notes && (
                    <p className="text-sm mt-2 text-gray-600">
                      {med.notes}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <div className="flex items-center text-xs text-gray-500">
                  <Check className="h-3 w-3 mr-1" />
                  Added on {formatDate(med.created_at)}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${meridiem}`;
};

const formatDate = (dateString: string): string => {
  return format(new Date(dateString), 'MMM d, yyyy');
};

export default MedicationReminders;
