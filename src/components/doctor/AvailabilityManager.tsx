
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface TimeSlot {
  startTime: string;
  endTime: string;
}

type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const daysOfWeek: WeekDay[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const defaultAvailability: Record<WeekDay, TimeSlot[]> = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: []
};

const AvailabilityManager = () => {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<Record<WeekDay, TimeSlot[]>>(defaultAvailability);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAvailability();
  }, [user]);

  const fetchAvailability = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('doctor_profiles')
        .select('availability')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data && data.availability) {
        // Cast the JSON data to our expected type with proper validation
        try {
          const availData = data.availability as Record<string, any>;
          // Ensure we have proper structure before setting state
          const parsedAvailability = { ...defaultAvailability };
          
          // Iterate through each day and validate its structure
          daysOfWeek.forEach(day => {
            if (Array.isArray(availData[day])) {
              parsedAvailability[day] = availData[day].map((slot: any) => ({
                startTime: typeof slot.startTime === 'string' ? slot.startTime : '09:00',
                endTime: typeof slot.endTime === 'string' ? slot.endTime : '17:00'
              }));
            }
          });
          
          setAvailability(parsedAvailability);
        } catch (parseError) {
          console.error('Error parsing availability data:', parseError);
          setAvailability(defaultAvailability);
        }
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Failed to load your availability schedule');
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = (day: WeekDay) => {
    setAvailability(prev => ({
      ...prev,
      [day]: [...prev[day], { startTime: '09:00', endTime: '17:00' }]
    }));
  };

  const removeTimeSlot = (day: WeekDay, index: number) => {
    setAvailability(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index)
    }));
  };

  const updateTimeSlot = (day: WeekDay, index: number, field: 'startTime' | 'endTime', value: string) => {
    setAvailability(prev => {
      const updated = {...prev};
      updated[day][index][field] = value;
      return updated;
    });
  };

  const saveAvailability = async () => {
    if (!user) return;
    
    setSaving(true);
    
    try {
      // Convert our strongly typed data to Json compatible format
      const availabilityJson = {} as Record<string, any>;
      
      // Create a structure that matches what Supabase expects
      Object.keys(availability).forEach(day => {
        availabilityJson[day] = availability[day as WeekDay].map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime
        }));
      });
      
      const { error } = await supabase
        .from('doctor_profiles')
        .update({ availability: availabilityJson })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success('Availability schedule saved successfully');
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save your availability schedule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-4">Your Availability</h2>
        <div className="py-8 text-center">
          <p className="text-muted-foreground">Loading your availability schedule...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-card p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Your Availability</h2>
        <Button 
          onClick={saveAvailability} 
          disabled={saving}
          className="rounded-full"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
      
      <div className="space-y-6">
        {daysOfWeek.map((day) => (
          <div key={day} className="border rounded-lg p-4 bg-card/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium capitalize">{day}</h3>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => addTimeSlot(day)}
                className="rounded-full"
              >
                Add Time Slot
              </Button>
            </div>
            
            {availability[day].length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Not available on this day</p>
            ) : (
              <div className="space-y-3">
                {availability[day].map((slot, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="grid grid-cols-2 gap-2 flex-grow">
                      <div>
                        <Label htmlFor={`${day}-start-${index}`} className="sr-only">
                          Start Time
                        </Label>
                        <Input
                          id={`${day}-start-${index}`}
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateTimeSlot(day, index, 'startTime', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${day}-end-${index}`} className="sr-only">
                          End Time
                        </Label>
                        <Input
                          id={`${day}-end-${index}`}
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateTimeSlot(day, index, 'endTime', e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTimeSlot(day, index)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default AvailabilityManager;
