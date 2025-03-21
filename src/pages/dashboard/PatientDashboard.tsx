
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Calendar, 
  Clock, 
  Layout, 
  Lightbulb,
  LogOut, 
  MessageSquare, 
  PillIcon,
  Search, 
  Settings, 
  User 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const PatientDashboard = () => {
  const [healthQuery, setHealthQuery] = useState('');
  const [isAssessing, setIsAssessing] = useState(false);

  const handleHealthQuery = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!healthQuery) {
      toast.error('Please enter a health query');
      return;
    }
    
    setIsAssessing(true);
    
    // Simulate AI assessment
    setTimeout(() => {
      setIsAssessing(false);
      toast.success('Assessment complete!');
      
      // In a real app, this would show results and doctor recommendations
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background/50">
      {/* Dashboard Layout */}
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border hidden md:block animate-slide-down">
          <div className="p-6">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-primary text-xl font-semibold">VirtualHealth</span>
            </Link>
          </div>
          
          <nav className="mt-6 px-3 space-y-1">
            <NavItem icon={Layout} href="/dashboard/patient" label="Dashboard" active />
            <NavItem icon={Calendar} href="/dashboard/patient/appointments" label="Appointments" />
            <NavItem icon={PillIcon} href="/dashboard/patient/medications" label="Medications" />
            <NavItem icon={MessageSquare} href="/dashboard/patient/messages" label="Messages" />
            <NavItem icon={Lightbulb} href="/dashboard/patient/health-tips" label="Health Tips" />
            <NavItem icon={User} href="/dashboard/patient/profile" label="Profile" />
            <NavItem icon={Settings} href="/dashboard/patient/settings" label="Settings" />
          </nav>
          
          <div className="mt-auto p-4 absolute bottom-0 left-0 right-0 border-t border-border">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={() => {
                toast.success('Logged out successfully');
                // In a real app, this would log the user out
              }}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Log Out
            </Button>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {/* Top Navigation */}
          <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
            <div className="flex items-center justify-between p-4">
              <h1 className="text-2xl font-semibold animate-fade-in">Patient Dashboard</h1>
              
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="icon" className="rounded-full relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs flex items-center justify-center">
                    3
                  </span>
                </Button>
                
                <div className="flex items-center space-x-2">
                  <Avatar>
                    <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cG9ydHJhaXR8ZW58MHx8MHx8fDA%3D" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium">Jane Doe</p>
                    <p className="text-xs text-muted-foreground">Patient</p>
                  </div>
                </div>
              </div>
            </div>
          </header>
          
          {/* Dashboard Content */}
          <div className="p-6 animate-slide-up">
            {/* Health Query Section */}
            <section className="mb-10">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>How are you feeling today?</CardTitle>
                  <CardDescription>
                    Describe your symptoms and we'll assess your condition
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleHealthQuery} className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <Input
                        type="text"
                        placeholder="E.g., I've been experiencing headaches for the past two days..."
                        className="pl-10"
                        value={healthQuery}
                        onChange={(e) => setHealthQuery(e.target.value)}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="rounded-full"
                      disabled={isAssessing}
                    >
                      {isAssessing ? 'Assessing...' : 'Assess My Condition'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </section>
            
            {/* Dashboard Overview */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Upcoming Appointments */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Upcoming Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingAppointments.map((appointment, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{appointment.doctorName}</p>
                            <p className="text-sm text-muted-foreground">{appointment.specialty}</p>
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <Clock className="h-4 w-4 mr-1" />
                              {appointment.datetime}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No upcoming appointments</p>
                      <Button asChild className="mt-4 rounded-full" variant="outline">
                        <Link to="/dashboard/patient/appointments">Book Appointment</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Medication Reminders */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PillIcon className="h-5 w-5 text-primary" />
                    Medication Reminders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {medications.length > 0 ? (
                    <div className="space-y-4">
                      {medications.map((medication, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                            <PillIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{medication.name}</p>
                            <p className="text-sm text-muted-foreground">{medication.dosage}</p>
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <Clock className="h-4 w-4 mr-1" />
                              {medication.schedule}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No medication reminders set</p>
                      <Button asChild className="mt-4 rounded-full" variant="outline">
                        <Link to="/dashboard/patient/medications">Add Medication</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Health Tips */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Health Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {healthTips.map((tip, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                          <Lightbulb className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{tip.title}</p>
                          <p className="text-sm text-muted-foreground">{tip.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// NavItem component
const NavItem = ({ 
  icon: Icon, 
  href, 
  label, 
  active = false 
}: { 
  icon: React.ElementType;
  href: string;
  label: string;
  active?: boolean;
}) => {
  return (
    <Link
      to={href}
      className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      <Icon className="h-5 w-5 mr-3" />
      {label}
    </Link>
  );
};

// Sample data for the dashboard
const upcomingAppointments = [
  {
    doctorName: 'Dr. Sarah Johnson',
    specialty: 'Cardiologist',
    datetime: 'Tuesday, May 10 • 2:00 PM',
  },
  {
    doctorName: 'Dr. Michael Chen',
    specialty: 'Neurologist',
    datetime: 'Friday, May 20 • 10:30 AM',
  },
];

const medications = [
  {
    name: 'Lisinopril',
    dosage: '10mg • 1 tablet',
    schedule: 'Daily at 8:00 AM',
  },
  {
    name: 'Metformin',
    dosage: '500mg • 2 tablets',
    schedule: 'Twice daily with meals',
  },
  {
    name: 'Atorvastatin',
    dosage: '20mg • 1 tablet',
    schedule: 'Daily at bedtime',
  },
];

const healthTips = [
  {
    title: 'Stay Hydrated',
    content: 'Drink at least 8 glasses of water daily to maintain proper hydration.',
  },
  {
    title: 'Regular Exercise',
    content: 'Aim for at least 30 minutes of moderate activity most days of the week.',
  },
  {
    title: 'Balanced Diet',
    content: 'Include fruits, vegetables, whole grains, and lean proteins in your meals.',
  },
];

export default PatientDashboard;
