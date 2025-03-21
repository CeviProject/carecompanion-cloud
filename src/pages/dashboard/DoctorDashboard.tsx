
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Calendar, 
  Clock, 
  Layout, 
  LogOut, 
  MessageSquare, 
  Settings, 
  User, 
  Users,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const DoctorDashboard = () => {
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
            <NavItem icon={Layout} href="/dashboard/doctor" label="Dashboard" active />
            <NavItem icon={Calendar} href="/dashboard/doctor/schedule" label="Schedule" />
            <NavItem icon={Users} href="/dashboard/doctor/patients" label="Patients" />
            <NavItem icon={MessageSquare} href="/dashboard/doctor/messages" label="Messages" />
            <NavItem icon={User} href="/dashboard/doctor/profile" label="Profile" />
            <NavItem icon={Settings} href="/dashboard/doctor/settings" label="Settings" />
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
              <h1 className="text-2xl font-semibold animate-fade-in">Doctor Dashboard</h1>
              
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="icon" className="rounded-full relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs flex items-center justify-center">
                    5
                  </span>
                </Button>
                
                <div className="flex items-center space-x-2">
                  <Avatar>
                    <AvatarImage src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8ZG9jdG9yfGVufDB8fDB8fHww" />
                    <AvatarFallback>DR</AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium">Dr. Robert Smith</p>
                    <p className="text-xs text-muted-foreground">Cardiologist</p>
                  </div>
                </div>
              </div>
            </div>
          </header>
          
          {/* Dashboard Content */}
          <div className="p-6 animate-slide-up">
            {/* Overview Stats */}
            <div className="grid gap-6 mb-8 md:grid-cols-3">
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Today's Appointments
                  </CardTitle>
                  <CardDescription className="text-2xl font-bold">
                    8
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    <span className="text-green-500 font-medium">↑ 12%</span> from last week
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    New Patient Requests
                  </CardTitle>
                  <CardDescription className="text-2xl font-bold">
                    5
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    <span className="text-green-500 font-medium">↑ 4%</span> from last week
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Availability This Week
                  </CardTitle>
                  <CardDescription className="text-2xl font-bold">
                    75%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    <span className="text-red-500 font-medium">↓ 5%</span> from last week
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              {/* Upcoming Appointments */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Today's Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {todayAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {todayAppointments.map((appointment, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                            <Clock className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{appointment.patientName}</p>
                              <Badge variant={appointment.status === 'Confirmed' ? 'default' : 'secondary'}>
                                {appointment.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {appointment.reason}
                            </p>
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <Clock className="h-4 w-4 mr-1" />
                              {appointment.time}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No appointments scheduled for today</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Appointment Requests */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Appointment Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appointmentRequests.length > 0 ? (
                    <div className="space-y-4">
                      {appointmentRequests.map((request, index) => (
                        <div key={index} className="flex flex-col gap-2 p-3 bg-accent rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{request.patientName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{request.patientName}</p>
                                <p className="text-xs text-muted-foreground">{request.reason}</p>
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Requested time:</span> {request.requestedTime}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" className="flex-1 rounded-full" onClick={() => toast.success(`Appointment with ${request.patientName} confirmed`)}>
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={() => toast.info(`Appointment with ${request.patientName} declined`)}>
                              <X className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No appointment requests</p>
                    </div>
                  )}
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
const todayAppointments = [
  {
    patientName: 'Jane Doe',
    reason: 'Annual checkup',
    time: '10:00 AM - 10:30 AM',
    status: 'Confirmed',
  },
  {
    patientName: 'Thomas Wilson',
    reason: 'Follow-up consultation',
    time: '11:15 AM - 11:45 AM',
    status: 'Confirmed',
  },
  {
    patientName: 'Emily Johnson',
    reason: 'Prescription renewal',
    time: '1:30 PM - 2:00 PM',
    status: 'Pending',
  },
  {
    patientName: 'Robert Davis',
    reason: 'Chest pain evaluation',
    time: '3:00 PM - 3:45 PM',
    status: 'Confirmed',
  },
];

const appointmentRequests = [
  {
    patientName: 'Margaret Lee',
    reason: 'Blood pressure concerns',
    requestedTime: 'Tomorrow, 11:00 AM',
  },
  {
    patientName: 'William Brown',
    reason: 'Medication side effects',
    requestedTime: 'Friday, 2:30 PM',
  },
  {
    patientName: 'Sarah Miller',
    reason: 'New patient consultation',
    requestedTime: 'Next Monday, 9:15 AM',
  },
];

export default DoctorDashboard;
