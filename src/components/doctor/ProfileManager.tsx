
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Common medical specialties
const MEDICAL_SPECIALTIES = [
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'Family Medicine',
  'Gastroenterology',
  'General Surgery',
  'Internal Medicine',
  'Neurology',
  'Obstetrics and Gynecology',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Pulmonology',
  'Radiology',
  'Urology'
];

const ProfileManager = () => {
  const { user } = useAuth();
  const [specialty, setSpecialty] = useState('');
  const [location, setLocation] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [isCustomSpecialty, setIsCustomSpecialty] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('doctor_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        const specialtyValue = data.specialty || '';
        setSpecialty(specialtyValue);
        setIsCustomSpecialty(!MEDICAL_SPECIALTIES.includes(specialtyValue));
        setCustomSpecialty(specialtyValue);
        setLocation(data.location || '');
        setYearsExperience(data.years_experience?.toString() || '');
        setBio(data.bio || '');
      }
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
      toast.error('Failed to load your profile');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    
    try {
      // Determine which specialty value to use
      const finalSpecialty = isCustomSpecialty ? customSpecialty : specialty;
      
      if (!finalSpecialty) {
        toast.error('Please select or enter a specialty');
        setSaving(false);
        return;
      }
      
      const { error } = await supabase
        .from('doctor_profiles')
        .update({
          specialty: finalSpecialty,
          location,
          years_experience: yearsExperience ? parseInt(yearsExperience) : null,
          bio
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success('Profile saved successfully');
      console.log('Doctor profile updated:', {
        specialty: finalSpecialty,
        location,
        years_experience: yearsExperience ? parseInt(yearsExperience) : null,
        bio
      });
    } catch (error) {
      console.error('Error saving doctor profile:', error);
      toast.error('Failed to save your profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
        <div className="py-8 text-center">
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-card p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Your Profile</h2>
        <Button 
          onClick={saveProfile} 
          disabled={saving}
          className="rounded-full"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
      
      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="specialty">Specialty</Label>
          {isCustomSpecialty ? (
            <div className="space-y-2">
              <Input
                id="customSpecialty"
                placeholder="Enter your medical specialty"
                value={customSpecialty}
                onChange={(e) => setCustomSpecialty(e.target.value)}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsCustomSpecialty(false)}
                className="mt-1"
              >
                Choose from common specialties instead
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Select
                value={specialty}
                onValueChange={setSpecialty}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a specialty" />
                </SelectTrigger>
                <SelectContent>
                  {MEDICAL_SPECIALTIES.map(spec => (
                    <SelectItem key={spec} value={spec}>
                      {spec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsCustomSpecialty(true)}
                className="mt-1"
              >
                Enter custom specialty
              </Button>
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="e.g., New York, NY"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="yearsExperience">Years of Experience</Label>
          <Input
            id="yearsExperience"
            type="number"
            placeholder="e.g., 10"
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
            min="0"
          />
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="bio">Professional Bio</Label>
          <Textarea
            id="bio"
            placeholder="Write a short bio about your professional experience and expertise..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
          />
        </div>
      </div>
    </Card>
  );
};

export default ProfileManager;
