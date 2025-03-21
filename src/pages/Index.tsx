
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Heart, MessageCircle, PillIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const Index = () => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-16">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-12 md:mb-0 animate-slide-up">
                <span className="inline-block px-3 py-1 bg-accent text-primary rounded-full text-sm font-medium mb-4">
                  Healthcare Reimagined
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                  Your Personal Health Assistant
                </h1>
                <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                  Helping elderly patients manage medications, appointments, and receive personalized health guidance with seamless doctor communication.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button asChild size="lg" className="rounded-full">
                    <Link to="/auth/register">Get Started</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="rounded-full">
                    <Link to="/features">Learn More</Link>
                  </Button>
                </div>
              </div>
              
              <div className="md:w-1/2 relative animate-fade-in">
                <div className={`relative transition-opacity duration-700 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-health-100/30 to-health-200/30 rounded-2xl transform rotate-3"></div>
                  <img
                    src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                    alt="Elderly patient with healthcare provider"
                    className="relative rounded-2xl shadow-lg object-cover w-full max-w-md mx-auto h-[500px]"
                    onLoad={() => setIsImageLoaded(true)}
                  />
                </div>
                <div className="absolute -bottom-6 -left-6 glass-card p-4 animate-scale-in" style={{ animationDelay: '0.3s' }}>
                  <div className="flex items-center space-x-3">
                    <div className="bg-health-100 p-2 rounded-full">
                      <PillIcon className="h-6 w-6 text-health-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Medication Reminder</p>
                      <p className="text-xs text-muted-foreground">Never miss a dose</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-6 -right-6 glass-card p-4 animate-scale-in" style={{ animationDelay: '0.6s' }}>
                  <div className="flex items-center space-x-3">
                    <div className="bg-health-100 p-2 rounded-full">
                      <Calendar className="h-6 w-6 text-health-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Appointment Booking</p>
                      <p className="text-xs text-muted-foreground">Simple scheduling</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-16 bg-gradient-to-b from-background to-accent/20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-slide-up">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How VirtualHealth Helps You</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Our platform offers a comprehensive suite of features designed to simplify healthcare management.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div 
                  key={feature.title} 
                  className="glass-card p-6 animate-scale-in"
                  style={{ animationDelay: `${0.2 * index}s` }}
                >
                  <div className="bg-health-100 p-3 rounded-full w-fit mb-4">
                    <feature.icon className="h-6 w-6 text-health-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* User Roles Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-slide-up">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">For Patients and Doctors</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                VirtualHealth caters to both patients needing care and doctors providing it.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-card p-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <h3 className="text-2xl font-semibold mb-4">For Patients</h3>
                <ul className="space-y-3">
                  {patientFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-5 h-5 rounded-full bg-health-100 flex items-center justify-center">
                          <ArrowRight className="h-3 w-3 text-health-600" />
                        </div>
                      </div>
                      <span className="ml-3 text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button asChild className="rounded-full">
                    <Link to="/auth/register?role=patient">Register as Patient</Link>
                  </Button>
                </div>
              </div>
              
              <div className="glass-card p-8 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <h3 className="text-2xl font-semibold mb-4">For Doctors</h3>
                <ul className="space-y-3">
                  {doctorFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-5 h-5 rounded-full bg-health-100 flex items-center justify-center">
                          <ArrowRight className="h-3 w-3 text-health-600" />
                        </div>
                      </div>
                      <span className="ml-3 text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button asChild className="rounded-full">
                    <Link to="/auth/register?role=doctor">Register as Doctor</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-16 bg-accent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center animate-scale-in">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Healthcare Management?</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join VirtualHealth today and experience seamless healthcare coordination and communication.
              </p>
              <Button asChild size="lg" className="rounded-full">
                <Link to="/auth/register">Get Started for Free</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

// Data for features
const features = [
  {
    icon: PillIcon,
    title: "Medication Management",
    description: "Set up reminders for medications and never miss a dose with smart notifications."
  },
  {
    icon: Calendar,
    title: "Appointment Booking",
    description: "Easily schedule appointments with doctors and receive timely reminders."
  },
  {
    icon: MessageCircle,
    title: "Health Guidance",
    description: "Get personalized health tips and recommendations based on your condition."
  },
  {
    icon: Heart,
    title: "AI Health Assessment",
    description: "Our AI analyzes your symptoms and recommends appropriate healthcare professionals."
  },
  {
    icon: MessageCircle,
    title: "Doctor Communication",
    description: "Connect with healthcare providers through a seamless communication system."
  },
  {
    icon: Calendar,
    title: "Calendar Integration",
    description: "Sync your appointments and medication schedules with Google Calendar."
  },
];

// Data for patient features
const patientFeatures = [
  "Easy medication management with reminders",
  "Simple appointment booking with nearby doctors",
  "AI-powered condition assessment",
  "Personalized health tips and recommendations",
  "Secure communication with healthcare providers",
  "Comprehensive health dashboard",
];

// Data for doctor features
const doctorFeatures = [
  "Efficient schedule management",
  "Patient appointment overview",
  "Secure patient communication",
  "Easy availability updates",
  "Streamlined consultation process",
  "Professional profile management",
];

export default Index;
