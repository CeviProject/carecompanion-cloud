
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  AlertCircle, 
  MapPin, 
  Send, 
  Loader2, 
  Hospital, 
  Navigation, 
  Shield, 
  Store 
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

// Types for our data
interface Hospital {
  name: string;
  address: string;
  distance: number;
  specialties: string[];
  elderlyFriendly: boolean;
  accessibility: string[];
}

interface Pharmacy {
  name: string;
  address: string;
  distance: number;
  openHours: string;
  deliveryAvailable: boolean;
}

interface InsurancePolicy {
  name: string;
  provider: string;
  costLevel: 'Low' | 'Medium' | 'High';
  coverage: string[];
  monthlyPremium: number;
  specialConditions: string[];
  elderlyBenefits: string[];
}

interface ChatbotResponse {
  assessment: string;
  hospitals: Hospital[];
  pharmacies: Pharmacy[];
  insurancePolicies: InsurancePolicy[];
  suggestedDepartments: string[];
}

const ElderlyHealthChatbot = () => {
  const { user } = useAuth();
  const [gender, setGender] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [symptoms, setSymptoms] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ChatbotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);

  // Detect location
  const detectLocation = () => {
    setIsDetectingLocation(true);
    
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setIsDetectingLocation(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Use reverse geocoding to get address from coordinates
          const response = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=74c89b3be64946ac96d777d08b878d43`
          );
          
          const data = await response.json();
          
          if (data.results && data.results.length > 0) {
            const result = data.results[0];
            const cityComponent = result.components.city || result.components.town || result.components.village;
            const stateComponent = result.components.state;
            const countryComponent = result.components.country;
            
            const formattedLocation = [cityComponent, stateComponent, countryComponent]
              .filter(Boolean)
              .join(', ');
            
            setLocation(formattedLocation);
            toast.success('Location detected successfully');
          } else {
            setLocation(`${latitude}, ${longitude}`);
            toast.warning('Detected coordinates, but couldn\'t resolve to an address');
          }
        } catch (error) {
          console.error('Error detecting location:', error);
          toast.error('Failed to detect location');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Could not get your location. Please enter it manually.');
        setIsDetectingLocation(false);
      }
    );
  };

  const validateForm = () => {
    if (!gender) {
      toast.error('Please select your gender');
      return false;
    }
    
    if (!age || parseInt(age) < 50 || parseInt(age) > 150) {
      toast.error('Please enter a valid age between 50 and 150');
      return false;
    }
    
    if (!symptoms.trim()) {
      toast.error('Please describe your symptoms');
      return false;
    }
    
    if (!location.trim()) {
      toast.error('Please enter your location or use automatic detection');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!user) {
      toast.error('You must be logged in to use this feature');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Format the query in the specified format
      const formattedQuery = `I am a ${gender} aged ${age} and I have symptoms ${symptoms}. My location is ${location}.`;
      
      console.log('Submitting query:', formattedQuery);
      toast.info('Processing your health query...');
      
      const { data, error: functionError } = await supabase.functions.invoke('elderly-health-assistant', {
        body: {
          query: formattedQuery,
          patientData: {
            gender,
            age: parseInt(age),
            symptoms: symptoms.split(',').map(s => s.trim()),
            location
          }
        }
      });
      
      console.log('Response from function:', data);
      
      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error('Failed to process your query');
      }
      
      if (!data) {
        throw new Error('No response received from the health assistant');
      }
      
      // Save the query to the database
      const { error: dbError } = await supabase
        .from('health_queries')
        .insert({
          patient_id: user.id,
          query_text: formattedQuery,
          ai_assessment: data.assessment,
          patient_data: {
            gender,
            age: parseInt(age),
            symptoms: symptoms.split(',').map(s => s.trim()),
            location,
            result: data
          }
        });
      
      if (dbError) {
        console.error('Database error:', dbError);
        // Non-blocking error - we'll still show results
        toast.warning('Your query was processed but could not be saved to your history');
      } else {
        console.log('Query saved to database');
      }
      
      setResult(data);
      toast.success('Your health query has been analyzed');
      
    } catch (error: any) {
      console.error('Error submitting health query:', error);
      setError(error.message || 'Failed to process your health query');
      toast.error('Failed to process your health query. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-xl">
      <h2 className="text-3xl font-bold mb-6 text-center">Elderly Health Assistant</h2>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-6 w-6" />
          <AlertDescription className="text-xl ml-2">{error}</AlertDescription>
        </Alert>
      )}
      
      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-xl">Gender</Label>
              <Select 
                value={gender} 
                onValueChange={setGender}
              >
                <SelectTrigger id="gender" className="h-14 text-xl">
                  <SelectValue placeholder="Select your gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male" className="text-xl">Male</SelectItem>
                  <SelectItem value="female" className="text-xl">Female</SelectItem>
                  <SelectItem value="other" className="text-xl">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="age" className="text-xl">Age (50-150)</Label>
              <Input
                id="age"
                type="number"
                min="50"
                max="150"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="h-14 text-xl"
                placeholder="Enter your age"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="symptoms" className="text-xl">Symptoms (comma-separated)</Label>
            <Textarea
              id="symptoms"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="min-h-[120px] text-xl"
              placeholder="e.g., joint pain, difficulty walking, shortness of breath"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="location" className="text-xl">Location (City, State, Country)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={detectLocation}
                disabled={isDetectingLocation}
                className="flex items-center gap-2 h-10"
              >
                {isDetectingLocation ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <Navigation className="h-4 w-4" />
                    Detect Location
                  </>
                )}
              </Button>
            </div>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-14 text-xl"
              placeholder="e.g., Mumbai, Maharashtra, India"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full btn-elderly" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Processing Your Request...
              </>
            ) : (
              <>
                <Send className="mr-2 h-6 w-6" />
                Get Health Recommendations
              </>
            )}
          </Button>
          
          <p className="text-lg text-muted-foreground text-center">
            This assessment is for informational purposes only and not a medical diagnosis.
            Always consult with a healthcare provider for medical concerns.
          </p>
        </form>
      ) : (
        <div className="space-y-8 animate-fade-up">
          <Tabs defaultValue="assessment" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="assessment" className="text-xl">Assessment</TabsTrigger>
              <TabsTrigger value="hospitals" className="text-xl">Hospitals</TabsTrigger>
              <TabsTrigger value="pharmacies" className="text-xl">Pharmacies</TabsTrigger>
              <TabsTrigger value="insurance" className="text-xl">Insurance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="assessment" className="mt-6">
              <div className="advice-container p-6 bg-white rounded-xl shadow-inner">
                <h3 className="text-2xl font-bold mb-4 flex items-center">
                  <AlertCircle className="h-6 w-6 mr-2 text-primary" />
                  Health Assessment
                </h3>
                <div className="advice-content">
                  {result.assessment.split('\n').map((paragraph, index) => (
                    <p key={index} className="text-xl">{paragraph}</p>
                  ))}
                </div>
                
                {result.suggestedDepartments && result.suggestedDepartments.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-xl font-bold mb-2">Suggested Medical Departments:</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.suggestedDepartments.map((dept, index) => (
                        <span key={index} className="px-3 py-2 bg-primary/10 text-primary font-medium rounded-full text-lg">
                          {dept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="hospitals" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold flex items-center">
                  <Hospital className="h-6 w-6 mr-2 text-primary" />
                  Nearby Hospitals
                </h3>
                
                {result.hospitals && result.hospitals.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.hospitals.map((hospital, index) => (
                      <div key={index} className="bg-white p-5 rounded-xl shadow-md border border-muted hover:shadow-lg transition-shadow">
                        <div className="flex justify-between">
                          <h4 className="text-xl font-bold">{hospital.name}</h4>
                          <span className="text-lg font-medium text-muted-foreground">
                            {hospital.distance.toFixed(1)} km
                          </span>
                        </div>
                        
                        <p className="text-lg flex items-start mt-2">
                          <MapPin className="h-5 w-5 mr-2 mt-1 text-muted-foreground" />
                          {hospital.address}
                        </p>
                        
                        {hospital.elderlyFriendly && (
                          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            Elderly-Friendly
                          </div>
                        )}
                        
                        {hospital.specialties && (
                          <div className="mt-3">
                            <h5 className="text-lg font-medium">Specialties:</h5>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {hospital.specialties.map((specialty, idx) => (
                                <span key={idx} className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
                                  {specialty}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {hospital.accessibility && hospital.accessibility.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-lg font-medium">Accessibility Features:</h5>
                            <ul className="list-disc list-inside text-lg mt-1">
                              {hospital.accessibility.map((feature, idx) => (
                                <li key={idx}>{feature}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xl text-muted-foreground">No hospitals found near your location.</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="pharmacies" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold flex items-center">
                  <Store className="h-6 w-6 mr-2 text-primary" />
                  Nearby Pharmacies
                </h3>
                
                {result.pharmacies && result.pharmacies.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.pharmacies.map((pharmacy, index) => (
                      <div key={index} className="bg-white p-5 rounded-xl shadow-md border border-muted hover:shadow-lg transition-shadow">
                        <div className="flex justify-between">
                          <h4 className="text-xl font-bold">{pharmacy.name}</h4>
                          <span className="text-lg font-medium text-muted-foreground">
                            {pharmacy.distance.toFixed(1)} km
                          </span>
                        </div>
                        
                        <p className="text-lg flex items-start mt-2">
                          <MapPin className="h-5 w-5 mr-2 mt-1 text-muted-foreground" />
                          {pharmacy.address}
                        </p>
                        
                        <p className="text-lg mt-2">
                          <span className="font-medium">Hours: </span>
                          {pharmacy.openHours}
                        </p>
                        
                        {pharmacy.deliveryAvailable && (
                          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            Home Delivery Available
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xl text-muted-foreground">No pharmacies found near your location.</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="insurance" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold flex items-center">
                  <Shield className="h-6 w-6 mr-2 text-primary" />
                  Recommended Insurance Policies
                </h3>
                
                {result.insurancePolicies && result.insurancePolicies.length > 0 ? (
                  <div className="space-y-6">
                    {['Low', 'Medium', 'High'].map((costLevel) => (
                      <div key={costLevel} className="space-y-3">
                        <h4 className="text-xl font-semibold border-b pb-2">
                          {costLevel} Cost Options
                        </h4>
                        
                        {result.insurancePolicies
                          .filter(policy => policy.costLevel === costLevel)
                          .map((policy, index) => (
                            <div 
                              key={index} 
                              className={`bg-white p-5 rounded-xl shadow-md border hover:shadow-lg transition-shadow
                                ${costLevel === 'Low' ? 'border-green-200' : 
                                  costLevel === 'Medium' ? 'border-blue-200' : 'border-purple-200'}`}
                            >
                              <div className="flex justify-between items-start">
                                <h5 className="text-xl font-bold">{policy.name}</h5>
                                <div className={`px-3 py-1 rounded-full text-sm font-medium
                                  ${costLevel === 'Low' ? 'bg-green-100 text-green-800' : 
                                    costLevel === 'Medium' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}
                                >
                                  ₹{policy.monthlyPremium.toLocaleString()} /month
                                </div>
                              </div>
                              
                              <p className="text-lg mt-1">
                                <span className="font-medium">Provider: </span>
                                {policy.provider}
                              </p>
                              
                              <div className="mt-3">
                                <h6 className="text-lg font-medium">Coverage:</h6>
                                <ul className="list-disc list-inside text-lg mt-1">
                                  {policy.coverage.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              {policy.elderlyBenefits && policy.elderlyBenefits.length > 0 && (
                                <div className="mt-3">
                                  <h6 className="text-lg font-medium">Elderly Benefits:</h6>
                                  <ul className="list-disc list-inside text-lg mt-1">
                                    {policy.elderlyBenefits.map((benefit, idx) => (
                                      <li key={idx}>{benefit}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {policy.specialConditions && policy.specialConditions.length > 0 && (
                                <div className="mt-3">
                                  <h6 className="text-lg font-medium text-amber-700">Special Conditions:</h6>
                                  <ul className="list-disc list-inside text-lg mt-1 text-amber-700">
                                    {policy.specialConditions.map((condition, idx) => (
                                      <li key={idx}>{condition}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xl text-muted-foreground">No insurance policies found based on your health conditions.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="text-center">
            <Button 
              onClick={() => setResult(null)} 
              variant="outline" 
              className="btn-elderly"
            >
              Start New Query
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElderlyHealthChatbot;
