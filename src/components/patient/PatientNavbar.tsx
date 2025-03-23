
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Calendar, 
  Pill, 
  Search, 
  ActivitySquare, 
  UserRound,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import SignOutButton from '@/components/auth/SignOutButton';

const PatientNavbar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    appointments: 0,
    medications: 0
  });

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const today = new Date();
        
        // Count upcoming appointments
        const { count: appointmentsCount, error: appError } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('patient_id', user.id)
          .eq('status', 'scheduled')
          .gt('date', today.toISOString());

        if (!appError) {
          setNotifications(prev => ({ ...prev, appointments: appointmentsCount || 0 }));
        }

        // Count today's medications
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const { count: medsCount, error: medError } = await supabase
          .from('medications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .lt('start_date', tomorrow.toISOString())
          .or(`end_date.is.null,end_date.gt.${today.toISOString()}`);

        if (!medError) {
          setNotifications(prev => ({ ...prev, medications: medsCount || 0 }));
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();

    // Set up real-time listeners
    const appointmentChannel = supabase
      .channel('appointments-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'appointments', filter: `patient_id=eq.${user.id}` },
        () => {
          setNotifications(prev => ({ ...prev, appointments: prev.appointments + 1 }));
        }
      )
      .subscribe();

    const medicationChannel = supabase
      .channel('medications-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'medications', filter: `user_id=eq.${user.id}` },
        () => {
          setNotifications(prev => ({ ...prev, medications: prev.medications + 1 }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentChannel);
      supabase.removeChannel(medicationChannel);
    };
  }, [user]);

  const navItems = [
    { label: 'Overview', path: '/patient/overview', icon: Home },
    { label: 'Appointments', path: '/patient/appointments', icon: Calendar, count: notifications.appointments },
    { label: 'Medications', path: '/patient/medications', icon: Pill, count: notifications.medications },
    { label: 'Health Query', path: '/patient/health-query', icon: Search },
    { label: 'Assessment', path: '/patient/assessment', icon: ActivitySquare },
    { label: 'Find Doctors', path: '/patient/doctors', icon: UserRound },
  ];

  return (
    <div className="fixed inset-x-0 top-16 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Mobile menu button */}
      <div className="flex md:hidden justify-between items-center px-4 h-12 border-b">
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
        <span className="font-medium text-sm">Patient Menu</span>
        <SignOutButton variant="ghost" size="icon" showText={false} />
      </div>

      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <nav className="flex flex-col p-2 space-y-1 bg-card/95 backdrop-blur">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium",
                  isActive(item.path)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {item.count ? (
                  <Badge variant="secondary" className="ml-2">{item.count}</Badge>
                ) : null}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Desktop navigation */}
      <div className="hidden md:block">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-4 lg:space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center text-sm font-medium transition-colors hover:text-primary relative",
                    isActive(item.path) 
                      ? "text-primary" 
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                  {item.count ? (
                    <Badge variant="secondary" className="ml-1">{item.count}</Badge>
                  ) : null}
                </Link>
              ))}
            </div>
            <SignOutButton />
          </nav>
        </div>
      </div>
    </div>
  );
};

export default PatientNavbar;
