
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, User, MapPin, BookOpen } from 'lucide-react';

interface DoctorRecommendationsProps {
  suggestedSpecialties?: string[] | null;
}

interface DoctorProfile {
  specialty: string;
  location: string | null;
  years_experience: number | null;
  bio: string | null;
}

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  doctor_profile: DoctorProfile;
}

const DoctorRecommendations = ({ suggestedSpecialties }: DoctorRecommendationsProps) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      if (!suggestedSpecialties || suggestedSpecialties.length === 0) {
        setDoctors([]);
        return;
      }
      
      setLoading(true);
      
      try {
        // First fetch doctor profiles that match specialties
        const { data: doctorProfilesData, error: doctorProfilesError } = await supabase
          .from('doctor_profiles')
          .select('id, specialty, location, years_experience, bio');
        
        if (doctorProfilesError) throw doctorProfilesError;
        
        if (!doctorProfilesData || doctorProfilesData.length === 0) {
          setDoctors([]);
          setLoading(false);
          return;
        }
        
        // Filter doctor profiles by specialty
        const filteredProfileIds = doctorProfilesData
          .filter(profile => 
            suggestedSpecialties.some(specialty => 
              profile.specialty.toLowerCase().includes(specialty.toLowerCase())
            )
          )
          .map(profile => profile.id);
        
        if (filteredProfileIds.length === 0) {
          setDoctors([]);
          setLoading(false);
          return;
        }
        
        // Get the user profile info for the filtered doctors
        const { data: doctorsData, error: doctorsError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', filteredProfileIds);
        
        if (doctorsError) throw doctorsError;
        
        // Combine the profile data with doctor profile data
        const combinedDoctors = doctorsData.map(doctor => {
          const doctorProfile = doctorProfilesData.find(profile => profile.id === doctor.id);
          return {
            ...doctor,
            doctor_profile: doctorProfile as DoctorProfile
          };
        });
        
        setDoctors(combinedDoctors);
      } catch (error) {
        console.error('Error fetching doctor recommendations:', error);
        toast.error('Failed to load doctor recommendations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDoctors();
  }, [suggestedSpecialties]);

  const handleBookAppointment = (doctorId: string) => {
    // This would be expanded in future phases to actually book appointments
    toast.success('Appointment booking will be available in future updates');
  };

  if (!suggestedSpecialties || suggestedSpecialties.length === 0) {
    return (
      <Card className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-4">Find Doctors</h2>
        <p className="text-muted-foreground">
          Submit a health query to get doctor recommendations based on your symptoms.
        </p>
      </Card>
    );
  }

  return (
    <Card className="glass-card p-6">
      <h2 className="text-xl font-semibold mb-4">Recommended Doctors</h2>
      
      {loading ? (
        <div className="py-10 text-center">
          <p className="text-muted-foreground">Loading doctor recommendations...</p>
        </div>
      ) : doctors.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-muted-foreground mb-2">No doctors found for the recommended specialties</p>
          <p className="text-sm">Try adjusting your health query or check back later as more doctors join our platform.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {doctors.map((doctor) => (
            <div key={doctor.id} className="border rounded-lg p-4 bg-card/50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Dr. {doctor.first_name} {doctor.last_name}
                  </h3>
                  
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="flex items-center text-muted-foreground">
                      <BookOpen className="h-4 w-4 mr-2" />
                      {doctor.doctor_profile.specialty}
                    </p>
                    
                    {doctor.doctor_profile.location && (
                      <p className="flex items-center text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        {doctor.doctor_profile.location}
                      </p>
                    )}
                    
                    {doctor.doctor_profile.years_experience && (
                      <p className="flex items-center text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        {doctor.doctor_profile.years_experience} years experience
                      </p>
                    )}
                  </div>
                  
                  {doctor.doctor_profile.bio && (
                    <p className="mt-3 text-sm">
                      {doctor.doctor_profile.bio.length > 150
                        ? `${doctor.doctor_profile.bio.substring(0, 150)}...`
                        : doctor.doctor_profile.bio}
                    </p>
                  )}
                </div>
                
                <Button 
                  onClick={() => handleBookAppointment(doctor.id)}
                  size="sm"
                  className="rounded-full"
                >
                  Book Appointment
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default DoctorRecommendations;
