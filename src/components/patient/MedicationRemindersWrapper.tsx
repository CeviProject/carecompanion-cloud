
import React, { useMemo } from 'react';
import { useGoogleCalendar } from '@/context/GoogleCalendarContext';
import MedicationReminders from './MedicationReminders';

// This is a wrapper component that provides the correct Google Calendar context properties
// to the MedicationReminders component
const MedicationRemindersWrapper = (props: any) => {
  const { isEnabled, isLoading, authorizeGoogleCalendar, getAccessToken } = useGoogleCalendar();
  
  // Use useMemo to prevent re-renders when googleCalendar hasn't changed
  const memoizedProps = useMemo(() => ({
    ...props,
    googleCalendar: {
      isEnabled,
      isLoading,
      authorizeGoogleCalendar,
      getAccessToken
    }
  }), [props, isEnabled, isLoading]);
  
  return <MedicationReminders {...memoizedProps} />;
};

export default MedicationRemindersWrapper;
