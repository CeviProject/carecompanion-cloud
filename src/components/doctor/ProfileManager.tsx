
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ProfileManager = () => {
  const { user } = useAuth();
  const [specialty, setSpecialty] = useState('');
  const [location, setLocation] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        setSpecialty(data.specialty || '');
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
      const { error } = await supabase
        .from('doctor_profiles')
        .update({
          specialty,
          location,
          years_experience: yearsExperience ? parseInt(yearsExperience) : null,
          bio
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success('Profile saved successfully');
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
          <Input
            id="specialty"
            placeholder="e.g., Cardiology, Pediatrics, etc."
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />
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
