
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, User, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProfileManager from '@/components/doctor/ProfileManager';
import AvailabilityManager from '@/components/doctor/AvailabilityManager';
import AppointmentList from '@/components/doctor/AppointmentList';

const DoctorDashboard = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-20 pb-16">
        <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Doctor Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, Dr. {profile?.last_name || 'Doctor'}
            </p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="w-full md:w-auto rounded-full p-1 bg-muted/50">
              <TabsTrigger value="overview" className="rounded-full">
                Overview
              </TabsTrigger>
              <TabsTrigger value="appointments" className="rounded-full">
                Appointments
              </TabsTrigger>
              <TabsTrigger value="availability" className="rounded-full">
                Availability
              </TabsTrigger>
              <TabsTrigger value="profile" className="rounded-full">
                Profile
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Today's Schedule</h2>
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">9:00 AM</p>
                        <p className="text-sm text-muted-foreground">Patient Consultation</p>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Scheduled
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">11:30 AM</p>
                        <p className="text-sm text-muted-foreground">Follow-up Appointment</p>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Scheduled
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">2:00 PM</p>
                        <p className="text-sm text-muted-foreground">New Patient Evaluation</p>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Scheduled
                      </span>
                    </div>
                  </div>
                </Card>
                
                <Card className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Your Metrics</h2>
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed Appointments</p>
                      <p className="text-2xl font-semibold">24</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Patient Satisfaction</p>
                      <p className="text-2xl font-semibold">4.9/5</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Response Time</p>
                      <p className="text-2xl font-semibold">1.2 hrs</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Quick Actions</h2>
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div className="space-y-3">
                    <button 
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
                      onClick={() => setActiveTab('appointments')}
                    >
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>View Appointments</span>
                      </div>
                    </button>
                    
                    <button 
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
                      onClick={() => setActiveTab('availability')}
                    >
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Update Availability</span>
                      </div>
                    </button>
                    
                    <button 
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
                      onClick={() => setActiveTab('profile')}
                    >
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        <span>Edit Profile</span>
                      </div>
                    </button>
                  </div>
                </Card>
              </div>
              
              <AppointmentList />
            </TabsContent>
            
            <TabsContent value="appointments" className="space-y-6">
              <AppointmentList />
            </TabsContent>
            
            <TabsContent value="availability" className="space-y-6">
              <AvailabilityManager />
            </TabsContent>
            
            <TabsContent value="profile" className="space-y-6">
              <ProfileManager />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default DoctorDashboard;
