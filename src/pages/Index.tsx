
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

const Index = () => {
  const { isAuthenticated, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Index page - Auth state:', { isAuthenticated, profileExists: !!profile, loading });
  }, [isAuthenticated, profile, loading]);

  const handleGetStarted = () => {
    if (loading) {
      console.log('Auth state is still loading, not redirecting yet');
      return;
    }

    if (isAuthenticated && profile) {
      console.log('User is authenticated with profile, redirecting to dashboard');
      navigate(`/dashboard/${profile.role || 'patient'}`);
    } else if (isAuthenticated) {
      console.log('User is authenticated but no profile, waiting for profile data');
      setTimeout(() => {
        if (profile) {
          navigate(`/dashboard/${profile.role || 'patient'}`);
        } else {
          console.log('No profile after waiting, redirecting to registration');
          navigate('/auth/register');
        }
      }, 500);
    } else {
      console.log('User is not authenticated, redirecting to registration');
      navigate('/auth/register');
    }
  };

  useEffect(() => {
    if (!loading && isAuthenticated && profile) {
      console.log('Auto-redirecting authenticated user to dashboard');
      navigate(`/dashboard/${profile.role || 'patient'}`);
    }
  }, [isAuthenticated, profile, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <section className="py-20 md:py-28 px-4">
          <div className="container mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 gradient-text animate-gradient">
                Virtual Healthcare for You
              </h1>
              <p className="text-xl text-muted-foreground mb-8 md:mb-12 max-w-2xl mx-auto">
                Connect with licensed doctors online, get prescriptions, and access personalized healthcare from the comfort of your home.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="rounded-full px-8 text-lg group"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8 text-lg"
                  asChild
                >
                  <Link to="/features">Learn More</Link>
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-full px-8 text-lg font-semibold bg-gradient-to-r from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 text-green-800"
                  asChild
                >
                  <Link to="">Try For Free</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        
        <section className="py-20 px-4 bg-muted/50">
          <div className="container mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Why Choose VirtualHealth?
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className="bg-card p-6 rounded-xl shadow-sm border border-border transition-all hover:shadow-md"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 md:p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to experience better healthcare?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of patients who have already made the switch to virtual healthcare.
              </p>
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="rounded-full px-8 text-lg"
              >
                Get Started Today
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

const features = [
  {
    title: "24/7 Doctor Availability",
    description: "Connect with licensed healthcare professionals anytime, day or night.",
    icon: <div className="text-primary text-xl">🩺</div>
  },
  {
    title: "Secure Video Consultations",
    description: "Face-to-face appointments from the comfort of your home.",
    icon: <div className="text-primary text-xl">📱</div>
  },
  {
    title: "Digital Prescriptions",
    description: "Get prescriptions sent directly to your preferred pharmacy.",
    icon: <div className="text-primary text-xl">💊</div>
  },
  {
    title: "Health Tracking",
    description: "Monitor your vital signs and health metrics over time.",
    icon: <div className="text-primary text-xl">📊</div>
  },
  {
    title: "Personalized Care Plans",
    description: "Receive customized healthcare recommendations for your needs.",
    icon: <div className="text-primary text-xl">📋</div>
  },
  {
    title: "Medication Reminders",
    description: "Never miss a dose with our integrated reminder system.",
    icon: <div className="text-primary text-xl">⏰</div>
  }
];

export default Index;
