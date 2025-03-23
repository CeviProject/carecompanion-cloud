
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Calendar as CalendarIcon, Clock, Pill, Trash2, Check, RefreshCw, Bell, Sparkle } from 'lucide-react';
import { format, addDays, isToday, parseISO } from 'date-fns';
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

  const fetchMedications = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      console.log('Fetching medications for user:', user?.id);
      
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Fetched medications:', data?.length || 0);
      setMedications(data as Medication[]);
      
      if (data) {
        const todayMeds = filterTodaysMedications(data as Medication[]);
        setTodaysMedications(todayMeds);
      }
    } catch (error: any) {
      console.error('Error fetching medications:', error);
      toast.error(`Failed to load medications: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
            console.log('Medication change detected:', payload);
            
            if (payload.eventType === 'INSERT') {
              console.log('New medication added:', payload.new);
              setMedications(prev => [payload.new as Medication, ...prev]);
              
              const newMed = payload.new as Medication;
              if (isMedicationForToday(newMed)) {
                setTodaysMedications(prev => [...prev, newMed]);
              }
              
              toast.success(`Medication "${payload.new.name}" added`);
            } else if (payload.eventType === 'UPDATE') {
              console.log('Medication updated:', payload.new);
              setMedications(prev => 
                prev.map(med => med.id === payload.new.id ? payload.new as Medication : med)
              );
              
              setTodaysMedications(prev => {
                const isAlreadyInToday = prev.some(med => med.id === payload.new.id);
                const shouldBeInToday = isMedicationForToday(payload.new as Medication);
                
                if (isAlreadyInToday && !shouldBeInToday) {
                  return prev.filter(med => med.id !== payload.new.id);
                } else if (!isAlreadyInToday && shouldBeInToday) {
                  return [...prev, payload.new as Medication];
                } else if (isAlreadyInToday && shouldBeInToday) {
                  return prev.map(med => med.id === payload.new.id ? payload.new as Medication : med);
                }
                
                return prev;
              });
              
              toast.info(`Medication "${payload.new.name}" updated`);
            } else if (payload.eventType === 'DELETE') {
              console.log('Medication deleted:', payload.old);
              setMedications(prev => prev.filter(med => med.id !== payload.old.id));
              setTodaysMedications(prev => prev.filter(med => med.id !== payload.old.id));
              toast.info(`Medication removed`);
            }
          }
        )
        .subscribe();
        
      console.log('Subscribed to medications changes');
      
      return () => {
        console.log('Unsubscribing from medications changes');
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchMedications]);

  const isMedicationForToday = (medication: Medication) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(medication.start_date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = medication.end_date ? new Date(medication.end_date) : null;
    if (endDate) endDate.setHours(0, 0, 0, 0);
    
    return startDate <= today && (!endDate || endDate >= today);
  };

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

      console.log('Adding new medication:', newMedication);
      
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

      console.log('Medication added successfully:', data);
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
      console.log('Deleting medication with id:', id);
      
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      console.log('Medication deleted successfully');
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

  const handleRefreshMedications = () => {
    toast.info("Refreshing medications...");
    fetchMedications();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center">
          <Pill className="h-6 w-6 mr-2 text-primary" />
          Medication Reminders
        </h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefreshMedications}
            className="mr-2 border-primary/30 hover:bg-primary/5"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh List
          </Button>
          <Button 
            variant="outline" 
            onClick={syncWithGoogleCalendar} 
            disabled={isSyncingCalendar}
            className="border-primary/30 hover:bg-primary/5"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isSyncingCalendar && "animate-spin")} />
            {isSyncingCalendar ? 'Syncing...' : 'Sync to Google Calendar'}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Medication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Pill className="h-5 w-5 mr-2 text-primary" />
                  Add New Medication
                </DialogTitle>
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
                      className="border-primary/30 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dosage">Dosage</Label>
                    <Input 
                      id="dosage" 
                      placeholder="e.g. 500mg"
                      value={newMedication.dosage}
                      onChange={(e) => setNewMedication({...newMedication, dosage: e.target.value})}
                      className="border-primary/30 focus-visible:ring-primary"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select 
                    value={newMedication.frequency}
                    onValueChange={(value) => setNewMedication({...newMedication, frequency: value})}
                  >
                    <SelectTrigger id="frequency" className="border-primary/30 focus-visible:ring-primary">
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
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input 
                      id="time" 
                      type="time"
                      value={newMedication.time}
                      onChange={(e) => setNewMedication({...newMedication, time: e.target.value})}
                      className="pl-10 border-primary/30 focus-visible:ring-primary"
                    />
                  </div>
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
                            "w-full justify-start text-left font-normal border-primary/30 hover:bg-primary/5"
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
                          className="p-3 pointer-events-auto"
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
                            "w-full justify-start text-left font-normal border-primary/30 hover:bg-primary/5"
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
                          className="border-t p-3 pointer-events-auto"
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
                    className="border-primary/30 focus-visible:ring-primary"
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
                <Button onClick={handleAddMedication} className="bg-primary hover:bg-primary/90">
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
        <Card className="bg-gradient-to-br from-white to-primary/5 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="relative">
              <Pill className="h-16 w-16 text-primary/40" />
              <Sparkle className="h-6 w-6 text-yellow-400 absolute top-0 right-0" />
            </div>
            <p className="text-center text-gray-500 max-w-md">No medications found. Add your first medication to get started.</p>
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Medication
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medications.map((med) => (
            <Card key={med.id} className={cn(
              "transition-all duration-300 hover:shadow-md border border-primary/10 overflow-hidden group",
              isToday(parseISO(med.start_date)) && "border-l-4 border-l-primary"
            )}>
              <div className="h-1 bg-gradient-to-r from-primary/40 to-primary/5"></div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center group-hover:text-primary transition-colors">
                      <Pill className="h-4 w-4 mr-2 text-primary" />
                      {med.name}
                    </CardTitle>
                    <p className="text-sm font-medium mt-1 text-primary/80">{med.dosage}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-red-500 opacity-60 hover:opacity-100 hover:bg-red-50"
                    onClick={() => handleDeleteMedication(med.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-primary/60" />
                    <span>
                      {med.frequency.replace(/_/g, ' ')} at {formatTimeWithAMPM(med.time)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CalendarIcon className="h-4 w-4 mr-2 text-primary/60" />
                    <span>
                      From {formatDate(med.start_date)}
                      {med.end_date ? ` to ${formatDate(med.end_date)}` : ''}
                    </span>
                  </div>
                  {med.notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-md text-sm text-gray-600 border-l-2 border-primary/30">
                      {med.notes}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-2 text-xs text-gray-500 flex justify-between items-center">
                <div className="flex items-center">
                  <Check className="h-3 w-3 mr-1 text-green-500" />
                  Added on {formatDate(med.created_at)}
                </div>
                <div className="flex items-center">
                  <Bell className="h-3 w-3 mr-1 text-amber-500" />
                  {formatTimeWithAMPM(med.time)}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const formatTimeWithAMPM = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const hour = parseInt(hours, 10);
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${meridiem}`;
};

const formatDate = (dateString: string): string => {
  return format(new Date(dateString), 'MMM d, yyyy');
};

export default MedicationReminders;
