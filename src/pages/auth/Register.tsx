
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, Mail, User, Stethoscope, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const Register = () => {
  const { signUp } = useAuth();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [specialty, setSpecialty] = useState('');
  const [age, setAge] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check URL parameters for role
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    if (roleParam === 'patient' || roleParam === 'doctor') {
      setRole(roleParam);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (role === 'patient') {
      if (!email || !password || !confirmPassword) {
        toast.error('Please fill in all required fields');
        return;
      }
    } else {
      if (!name || !email || !password || !confirmPassword) {
        toast.error('Please fill in all required fields');
        return;
      }
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (role === 'patient' && !age) {
      toast.error('Please enter your age');
      return;
    }
    
    if (role === 'doctor' && !specialty) {
      toast.error('Please enter your specialty');
      return;
    }
    
    setIsLoading(true);

    try {
      // For patients, use anonymous name
      let userData;
      
      if (role === 'patient') {
        userData = {
          first_name: 'Anonymous',
          last_name: 'Patient',
          role: 'patient',
          age: parseInt(age)
        };
      } else {
        // Split name into first and last name for doctors
        const nameParts = name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        userData = {
          first_name: firstName,
          last_name: lastName || '',
          role: 'doctor',
          specialty: specialty
        };
      }
      
      await signUp(email, password, userData);
      // The auth context will handle navigation and success toasts
    } catch (error) {
      console.error('Registration error:', error);
      // Error is already handled in the AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md animate-scale-in">
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Create Your Account</h1>
              <p className="text-muted-foreground">Join VirtualHealth today</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <Label>I am a:</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(value) => setRole(value as 'patient' | 'doctor')}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="patient" id="patient" />
                    <Label htmlFor="patient" className="cursor-pointer flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      Patient
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="doctor" id="doctor" />
                    <Label htmlFor="doctor" className="cursor-pointer flex items-center">
                      <Stethoscope className="h-4 w-4 mr-1" />
                      Doctor
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {role === 'doctor' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      className="pl-10"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={role === 'doctor'}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              {role === 'patient' && (
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Input
                      id="age"
                      type="number"
                      placeholder="65"
                      className="pl-10"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      min="1"
                      max="120"
                    />
                  </div>
                </div>
              )}
              
              {role === 'doctor' && (
                <div className="space-y-2">
                  <Label htmlFor="specialty">Specialty</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Stethoscope className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Input
                      id="specialty"
                      type="text"
                      placeholder="Cardiology"
                      className="pl-10"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full rounded-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link 
                  to="/auth/login" 
                  className="text-primary hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Register;
