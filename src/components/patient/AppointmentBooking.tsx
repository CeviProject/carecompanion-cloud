import { useState, useEffect } from 'react';
import { useGoogleCalendar } from '@/context/GoogleCalendarContext';

// Create a wrapper component to use in place of AppointmentBooking
const AppointmentBookingWrapper = (props) => {
  const { isEnabled: googleCalendarEnabled, authorizeGoogleCalendar } = useGoogleCalendar();
  const [localGoogleCalendarEnabled, setLocalGoogleCalendarEnabled] = useState(googleCalendarEnabled);
  
  useEffect(() => {
    setLocalGoogleCalendarEnabled(googleCalendarEnabled);
  }, [googleCalendarEnabled]);
  
  // Pass the needed props to the original component
  return <OriginalAppointmentBooking 
    {...props} 
    googleCalendarEnabled={localGoogleCalendarEnabled}
    setGoogleCalendarEnabled={setLocalGoogleCalendarEnabled}
    authorizeGoogleCalendar={authorizeGoogleCalendar}
  />;
};

// Rename the original component
const OriginalAppointmentBooking = ({ 
  googleCalendarEnabled, 
  setGoogleCalendarEnabled, 
  authorizeGoogleCalendar 
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

  useEffect(() => {
    // Fetch doctors from API
    const fetchDoctors = async () => {
      try {
        const response = await fetch('/api/doctors');
        if (!response.ok) throw new Error('Failed to fetch doctors');
        const data = await response.json();
        setDoctors(data);
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
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      const response = await fetch(
        `/api/availability?doctorId=${selectedDoctor.id}&date=${formattedDate}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch availability');
      
      const data = await response.json();
      setAvailableTimes(data.availableTimes || []);
    } catch (err) {
      setError('Failed to load available times. Please try again.');
      console.error(err);
    } finally {
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
      
      alert('Appointment booked successfully!');
      
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
    return <div>Loading doctors...</div>;
  }

  return (
    <div className="appointment-booking">
      <h2>Book an Appointment</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="doctor">Select Doctor:</label>
          <select 
            id="doctor"
            value={selectedDoctor?.id || ''}
            onChange={(e) => {
              const doctor = doctors.find(d => d.id === e.target.value);
              setSelectedDoctor(doctor);
            }}
            disabled={isSubmitting}
            required
          >
            <option value="">-- Select a doctor --</option>
            {doctors.map(doctor => (
              <option key={doctor.id} value={doctor.id}>
                Dr. {doctor.name} - {doctor.specialty}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="date">Select Date:</label>
          <input
            type="date"
            id="date"
            min={new Date().toISOString().split('T')[0]}
            value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
            onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)}
            disabled={isSubmitting || !selectedDoctor}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="time">Select Time:</label>
          <select
            id="time"
            value={selectedTime || ''}
            onChange={(e) => setSelectedTime(e.target.value)}
            disabled={isSubmitting || !selectedDate || availableTimes.length === 0}
            required
          >
            <option value="">-- Select a time --</option>
            {availableTimes.map(time => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          {selectedDate && availableTimes.length === 0 && !isLoading && (
            <p className="no-times">No available times for this date. Please select another date.</p>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="reason">Reason for Visit:</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
            rows={3}
          />
        </div>
        
        <div className="form-group calendar-integration">
          <label>
            <input
              type="checkbox"
              checked={googleCalendarEnabled}
              onChange={handleGoogleCalendarToggle}
              disabled={isSubmitting}
            />
            Add to Google Calendar
          </label>
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting || !selectedDoctor || !selectedDate || !selectedTime}
        >
          {isSubmitting ? 'Booking...' : 'Book Appointment'}
        </button>
      </form>
    </div>
  );
};

export default AppointmentBookingWrapper;
