
import React from 'react';
import { useGoogleCalendar } from '@/context/GoogleCalendarContext';
import MedicationReminders from './MedicationReminders';

// This is a wrapper component that provides the correct Google Calendar context properties
// to the MedicationReminders component
const MedicationRemindersWrapper = (props) => {
  const googleCalendar = useGoogleCalendar();
  
  // We're passing the needed properties from our context to make it compatible
  // with what MedicationReminders expects
  return <MedicationReminders 
    {...props} 
    googleCalendar={googleCalendar}
  />;
};

export default MedicationRemindersWrapper;
