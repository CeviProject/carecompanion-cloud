
import { useState, useEffect, useMemo } from 'react';
import { useGoogleCalendar } from '@/context/GoogleCalendarContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

// Wrapper component that handles the Google Calendar integration
const AppointmentBookingWrapper = (props) => {
  const { isEnabled, isLoading, authorizeGoogleCalendar } = useGoogleCalendar();
  const [localGoogleCalendarEnabled, setLocalGoogleCalendarEnabled] = useState(isEnabled);
  
  // Update local state when the context changes
  useEffect(() => {
    setLocalGoogleCalendarEnabled(isEnabled);
  }, [isEnabled]);
  
  // Pass the needed props to the original component
  return <OriginalAppointmentBooking 
    {...props} 
    googleCalendarEnabled={localGoogleCalendarEnabled}
    setGoogleCalendarEnabled={setLocalGoogleCalendarEnabled}
    authorizeGoogleCalendar={authorizeGoogleCalendar}
    googleCalendarLoading={isLoading}
  />;
};

// The original appointment booking component
const OriginalAppointmentBooking = ({ 
  googleCalendarEnabled, 
  setGoogleCalendarEnabled, 
  authorizeGoogleCalendar,
  googleCalendarLoading
}) => {
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    // Fetch doctors from API
    const fetchDoctors = async () => {
      try {
        // For development, use mock data until the API is ready
        // In production this would call the real API
        // const response = await fetch('/api/doctors');
        // if (!response.ok) throw new Error('Failed to fetch doctors');
        // const data = await response.json();
        
        // Mock data for development
        const mockDoctors = [
          { id: '1', name: 'John Smith', specialty: 'Cardiology', address: '123 Medical Center Ave' },
          { id: '2', name: 'Sarah Johnson', specialty: 'Neurology', address: '456 Health Parkway' },
          { id: '3', name: 'Robert Chen', specialty: 'Pediatrics', address: '789 Care Boulevard' },
        ];
        
        setDoctors(mockDoctors);
      } catch (err) {
        setError('Failed to load doctors. Please try again later.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  useEffect(() => {
    // When doctor and date are selected, fetch available times
    if (selectedDoctor && selectedDate) {
      fetchAvailableTimes();
    } else {
      setAvailableTimes([]);
    }
  }, [selectedDoctor, selectedDate]);

  const fetchAvailableTimes = async () => {
    try {
      setIsLoading(true);
      // Format date for API
      const formattedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
      
      // For development, use mock data
      // In production this would call the real API
      /* 
      const response = await fetch(
        `/api/availability?doctorId=${selectedDoctor.id}&date=${formattedDate}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch availability');
      
      const data = await response.json();
      setAvailableTimes(data.availableTimes || []);
      */
      
      // Mock data for development
      setTimeout(() => {
        const mockTimes = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
        setAvailableTimes(mockTimes);
        setIsLoading(false);
      }, 500);
      
    } catch (err) {
      setError('Failed to load available times. Please try again.');
      console.error(err);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      setError('Please select a doctor, date, and time.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Combine date and time
      const appointmentDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      appointmentDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      
      const appointmentData = {
        doctorId: selectedDoctor.id,
        dateTime: appointmentDateTime.toISOString(),
        reason: reason,
        addToGoogleCalendar: googleCalendarEnabled
      };
      
      // For development, simulate a successful API call
      // In production this would call the real API
      /*
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appointmentData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to book appointment');
      }
      */
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // If Google Calendar is enabled, add event
      if (googleCalendarEnabled) {
        const endTime = new Date(appointmentDateTime);
        endTime.setMinutes(endTime.getMinutes() + 30); // 30 min appointment
        
        await addToGoogleCalendar({
          summary: `Appointment with Dr. ${selectedDoctor.name}`,
          description: reason || 'Medical appointment',
          location: selectedDoctor.address || 'Medical Center',
          start: appointmentDateTime,
          end: endTime
        });
      }
      
      // Reset form
      setSelectedDoctor(null);
      setSelectedDate(null);
      setSelectedTime(null);
      setReason('');
      
      toast({
        title: "Appointment Booked",
        description: "Your appointment has been booked successfully.",
      });
      
    } catch (err) {
      setError('Failed to book appointment. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addToGoogleCalendar = async (eventDetails) => {
    try {
      if (!googleCalendarEnabled) {
        console.log('Google Calendar not enabled');
        return false;
      }
      
      // For development, simulate a successful API call
      // In production this would call the real API
      /*
      const response = await fetch('/api/google-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventDetails)
      });
      
      if (!response.ok) {
        throw new Error('Failed to add event to Google Calendar');
      }
      */
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return true;
    } catch (err) {
      console.error('Error adding to Google Calendar:', err);
      return false;
    }
  };

  const handleGoogleCalendarToggle = async () => {
    if (!googleCalendarEnabled) {
      // If not enabled, start authorization flow
      await authorizeGoogleCalendar();
    } else {
      // If already enabled, just toggle the local state
      setGoogleCalendarEnabled(false);
    }
  };

  if (isLoading && doctors.length === 0) {
    return <div className="flex justify-center p-8">Loading doctors...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="doctor">Select Doctor</Label>
          <Select 
            value={selectedDoctor?.id || ''}
            onValueChange={(value) => {
              const doctor = doctors.find(d => d.id === value);
              setSelectedDoctor(doctor);
            }}
            disabled={isSubmitting}
          >
            <SelectTrigger id="doctor" className="w-full">
              <SelectValue placeholder="-- Select a doctor --" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map(doctor => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  Dr. {doctor.name} - {doctor.specialty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="date">Select Date</Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                disabled={isSubmitting || !selectedDoctor}
              >
                {selectedDate ? format(selectedDate, 'PPP') : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setCalendarOpen(false);
                }}
                disabled={(date) => {
                  // Disable past dates
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="time">Select Time</Label>
          <Select
            value={selectedTime || ''}
            onValueChange={setSelectedTime}
            disabled={isSubmitting || !selectedDate || availableTimes.length === 0}
          >
            <SelectTrigger id="time" className="w-full">
              <SelectValue placeholder="-- Select a time --" />
            </SelectTrigger>
            <SelectContent>
              {availableTimes.map(time => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDate && availableTimes.length === 0 && !isLoading && (
            <p className="text-sm text-red-500">No available times for this date. Please select another date.</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="reason">Reason for Visit</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
            rows={3}
            placeholder="Please describe the reason for your appointment"
            className="resize-none"
          />
        </div>
        
        <div className="flex items-center space-x-2 py-2">
          <Switch
            id="google-calendar"
            checked={googleCalendarEnabled}
            onCheckedChange={handleGoogleCalendarToggle}
            disabled={isSubmitting || googleCalendarLoading}
          />
          <Label htmlFor="google-calendar" className="cursor-pointer">
            Add to Google Calendar
          </Label>
        </div>
        
        <Button 
          type="submit" 
          disabled={isSubmitting || !selectedDoctor || !selectedDate || !selectedTime}
          className="w-full"
        >
          {isSubmitting ? 'Booking...' : 'Book Appointment'}
        </Button>
      </form>
    </div>
  );
};

export default AppointmentBookingWrapper;
