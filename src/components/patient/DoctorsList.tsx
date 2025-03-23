
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Clock, MapPin, Bookmark, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Doctor {
  id: string;
  profiles: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  specialty: string;
  years_experience: number | null;
  location: string | null;
  bio: string | null;
}

const DoctorsList = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialty, setSpecialty] = useState<string>('all');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDoctors();
  }, [specialty]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      
      // Use a more explicit join to avoid ambiguity
      let query = supabase
        .from('doctor_profiles')
        .select(`
          id,
          specialty,
          years_experience,
          location,
          bio,
          profiles:profiles!doctor_profiles_id_fkey (
            id,
            first_name,
            last_name
          )
        `);
      
      if (specialty !== 'all') {
        query = query.ilike('specialty', `%${specialty}%`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching doctors:', error);
        toast.error(`Error fetching doctors: ${error.message}`);
        throw error;
      }
      
      console.log('Fetched doctors data:', data);
      
      // Transform the data to match our Doctor interface
      const formattedDoctors = data?.map(doctor => ({
        id: doctor.id,
        profiles: doctor.profiles,
        specialty: doctor.specialty,
        years_experience: doctor.years_experience,
        location: doctor.location,
        bio: doctor.bio
      })) || [];
      
      console.log('Formatted doctors:', formattedDoctors);
      
      // Filter out doctors without valid profiles to avoid null reference errors
      const validDoctors = formattedDoctors.filter(doctor => doctor.profiles !== null);
      setDoctors(validDoctors);

      // Get unique specialties for the filter
      if (specialty === 'all') {
        const allSpecialties = data?.map(doc => doc.specialty) || [];
        const uniqueSpecialties = [...new Set(allSpecialties.filter(Boolean))];
        console.log('Available specialties:', uniqueSpecialties);
        setSpecialties(uniqueSpecialties);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to load doctors. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = (doctorId: string) => {
    navigate('/patient/appointments', { state: { selectedDoctorId: doctorId } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Available Doctors</h2>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Select 
            value={specialty} 
            onValueChange={setSpecialty}
          >
            <SelectTrigger className="w-full sm:w-[200px] text-base">
              <SelectValue placeholder="Filter by specialty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-base">All Specialties</SelectItem>
              {specialties.map(spec => (
                <SelectItem key={spec} value={spec} className="text-base">
                  {spec}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">Loading doctors...</p>
        </div>
      ) : doctors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">No doctors found</p>
            <p className="text-muted-foreground mt-1">
              {specialty !== 'all' 
                ? `No doctors available with ${specialty} specialty.` 
                : 'No doctors are currently available.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {doctors.map((doctor) => (
            <Card key={doctor.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {doctor.profiles ? (
                          `Dr. ${doctor.profiles.first_name} ${doctor.profiles.last_name}`
                        ) : (
                          "Doctor"
                        )}
                      </h3>
                      <p className="text-lg text-muted-foreground">{doctor.specialty}</p>
                    </div>
                    <Badge variant="outline" className="h-fit text-base px-3 py-1">
                      {doctor.years_experience 
                        ? `${doctor.years_experience} years exp.`
                        : 'New Doctor'}
                    </Badge>
                  </div>
                  
                  {doctor.bio && (
                    <p className="text-base line-clamp-2">{doctor.bio}</p>
                  )}
                  
                  <div className="space-y-2">
                    {doctor.location && (
                      <div className="flex items-center gap-2 text-base">
                        <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <span>{doctor.location}</span>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    onClick={() => handleBookAppointment(doctor.id)}
                    className="w-full text-lg py-6"
                  >
                    Book Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorsList;
