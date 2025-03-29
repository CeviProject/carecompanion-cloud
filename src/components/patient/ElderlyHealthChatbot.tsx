import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Send, Bot, User, MapPin, Building, Phone, Clock, Calendar, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import HealthAssessment from './HealthAssessment';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Hospital {
  name: string;
  address: string;
  specialty?: string;
  distance?: number | string;
  phone?: string;
}

interface Pharmacy {
  name: string;
  address: string;
  distance?: number | string;
  hours?: string;
  phone?: string;
}

interface InsurancePolicy {
  name: string;
  coverage: string;
  premium?: string;
  benefits?: string[];
}

interface HealthQueryResponse {
  assessment: string;
  hospitals?: Hospital[];
  pharmacies?: Pharmacy[];
  insurancePolicies?: InsurancePolicy[];
  suggestedDepartments?: string[];
  suggestedSpecialties?: string[];
}

interface FormValues {
  message: string;
  age?: string;
  gender?: string;
  location?: string;
  medicalHistory?: string;
}

const ElderlyHealthChatbot = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your health assistant. I can help you find information about your health concerns, recommend nearby hospitals, pharmacies, and suggest insurance policies. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [healthQueryResponse, setHealthQueryResponse] = useState<HealthQueryResponse | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const form = useForm<FormValues>({
    defaultValues: {
      message: '',
      age: '',
      gender: '',
      location: '',
      medicalHistory: ''
    }
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (values: FormValues) => {
    setError(null);
    
    if (!values.message.trim()) {
      toast.error('Please enter your health question');
      return;
    }
    
    if (!user) {
      toast.error('You must be logged in to submit a health query');
      return;
    }
    
    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: values.message,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      role: 'assistant',
      content: 'Analyzing your health query...',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, typingMessage]);
    
    try {
      console.log('Starting health query submission process');
      const patientData = {
        symptoms: values.message,
        age: values.age,
        gender: values.gender,
        location: values.location,
        medicalHistory: values.medicalHistory || 'None provided'
      };
      
      console.log('Prepared patient data:', patientData);
      console.log('Calling health-assessment edge function');
      
      const { data: aiData, error: aiError } = await supabase.functions.invoke('health-assessment', {
        body: { 
          healthQuery: values.message,
          patientData
        }
      });
      
      console.log('Edge function response:', { data: aiData ? 'Data received' : 'No data', error: aiError });
      
      if (aiError) {
        console.error('Error from health-assessment function:', aiError);
        throw new Error(`AI assessment failed: ${aiError.message}`);
      }
      
      if (!aiData) {
        console.error('No data returned from health-assessment function');
        throw new Error('No data returned from the health assessment');
      }
      
      if (aiData.error) {
        console.error('Error in AI response:', aiData.error);
        throw new Error(aiData.error);
      }
      
      console.log('Full AI response data:', aiData);
      
      // Process hospitals to ensure distance is properly formatted
      const processedHospitals = aiData.hospitals || aiData.recommendedHospitals || [];
      if (processedHospitals.length > 0) {
        processedHospitals.forEach((hospital: Hospital) => {
          if (hospital.distance !== undefined && typeof hospital.distance === 'number') {
            hospital.distance = `${hospital.distance.toFixed(1)} km`;
          }
        });
      }
      
      // Save the processed response
      const healthResponse: HealthQueryResponse = {
        assessment: aiData.assessment || '',
        hospitals: processedHospitals,
        pharmacies: aiData.pharmacies || [],
        insurancePolicies: aiData.insurancePolicies || [],
        suggestedDepartments: aiData.suggestedDepartments || aiData.suggestedSpecialties || []
      };
      
      setHealthQueryResponse(healthResponse);
      
      console.log('Saving health query to database');
      const { data: queryData, error: queryError } = await supabase
        .from('health_queries')
        .insert({
          patient_id: user.id,
          query_text: values.message,
          ai_assessment: aiData.assessment || JSON.stringify(aiData),
          patient_data: {
            ...patientData,
            suggestedSpecialties: healthResponse.suggestedDepartments
          }
        })
        .select()
        .single();
      
      if (queryError) {
        console.error('Error saving query to database:', queryError);
        throw queryError;
      }
      
      console.log('Health query saved successfully:', queryData);
      
      // Remove typing indicator and add AI response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'typing');
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I\'ve analyzed your health information. Here\'s what I found:',
          timestamp: new Date()
        };
        return [...filtered, aiMessage];
      });
      
      form.reset({ message: '' });
    } catch (error: any) {
      console.error('Error submitting health query:', error);
      setError(error.message || 'Failed to process your health query');
      
      // Remove typing indicator and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'typing');
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I'm sorry, I encountered an error: ${error.message || 'Failed to process your health query'}. Please try again.`,
          timestamp: new Date()
        };
        return [...filtered, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 mb-4 border rounded-lg bg-background">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[80%] ${
                message.role === 'user'
                  ? 'flex-row-reverse'
                  : 'flex-row'
              }`}
            >
              <Avatar className={`h-10 w-10 ${message.role === 'user' ? 'ml-2' : 'mr-2'}`}>
                {message.role === 'user' ? (
                  <>
                    <AvatarImage src="/avatars/user-avatar.png" />
                    <AvatarFallback><User /></AvatarFallback>
                  </>
                ) : (
                  <>
                    <AvatarImage src="/avatars/ai-avatar.png" />
                    <AvatarFallback><Bot /></AvatarFallback>
                  </>
                )}
              </Avatar>
              <div>
                <div
                  className={`rounded-lg p-3 text-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.id === 'typing' ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {message.content}
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
                <div
                  className={`text-xs text-muted-foreground mt-1 ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {healthQueryResponse && (
        <div className="mb-4">
          <Tabs defaultValue="assessment">
            <TabsList className="w-full">
              <TabsTrigger value="assessment">Assessment</TabsTrigger>
              <TabsTrigger value="hospitals">Hospitals</TabsTrigger>
              <TabsTrigger value="pharmacies">Pharmacies</TabsTrigger>
              <TabsTrigger value="insurance">Insurance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="assessment" className="mt-4">
              <HealthAssessment 
                assessment={healthQueryResponse.assessment}
                suggestedSpecialties={healthQueryResponse.suggestedDepartments}
              />
            </TabsContent>
            
            <TabsContent value="hospitals" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recommended Hospitals</CardTitle>
                  <CardDescription>Nearby medical facilities for your condition</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {healthQueryResponse.hospitals && healthQueryResponse.hospitals.length > 0 ? (
                    healthQueryResponse.hospitals.map((hospital, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-card/50">
                        <div className="flex items-start">
                          <Building className="h-5 w-5 text-primary mr-2 mt-0.5" />
                          <div>
                            <h4 className="font-medium">{hospital.name}</h4>
                            <p className="text-sm text-muted-foreground flex items-center mt-1">
                              <MapPin className="h-4 w-4 mr-1" /> 
                              {hospital.address}
                            </p>
                            {hospital.specialty && (
                              <p className="text-xs mt-1">
                                <span className="font-medium">Specialty:</span> {hospital.specialty}
                              </p>
                            )}
                            {hospital.distance && (
                              <p className="text-xs mt-1">
                                <span className="font-medium">Distance:</span> {hospital.distance}
                              </p>
                            )}
                            {hospital.phone && (
                              <p className="text-xs mt-1 flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {hospital.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground">No hospital recommendations available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="pharmacies" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Nearby Pharmacies</CardTitle>
                  <CardDescription>Places to get your medications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {healthQueryResponse.pharmacies && healthQueryResponse.pharmacies.length > 0 ? (
                    healthQueryResponse.pharmacies.map((pharmacy, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-card/50">
                        <div className="flex items-start">
                          <Building className="h-5 w-5 text-primary mr-2 mt-0.5" />
                          <div>
                            <h4 className="font-medium">{pharmacy.name}</h4>
                            <p className="text-sm text-muted-foreground flex items-center mt-1">
                              <MapPin className="h-4 w-4 mr-1" /> 
                              {pharmacy.address}
                            </p>
                            {pharmacy.distance && (
                              <p className="text-xs mt-1">
                                <span className="font-medium">Distance:</span> {pharmacy.distance}
                              </p>
                            )}
                            {pharmacy.hours && (
                              <p className="text-xs mt-1 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {pharmacy.hours}
                              </p>
                            )}
                            {pharmacy.phone && (
                              <p className="text-xs mt-1 flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {pharmacy.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground">No pharmacy recommendations available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="insurance" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recommended Insurance</CardTitle>
                  <CardDescription>Health insurance options that may cover your needs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {healthQueryResponse.insurancePolicies && healthQueryResponse.insurancePolicies.length > 0 ? (
                    healthQueryResponse.insurancePolicies.map((policy, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-card/50">
                        <h4 className="font-medium">{policy.name}</h4>
                        <p className="text-sm mt-1">{policy.coverage}</p>
                        {policy.premium && (
                          <p className="text-xs mt-1">
                            <span className="font-medium">Premium:</span> {policy.premium}
                          </p>
                        )}
                        {policy.benefits && policy.benefits.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium">Benefits:</p>
                            <ul className="text-xs list-disc pl-5 mt-1">
                              {policy.benefits.map((benefit, i) => (
                                <li key={i}>{benefit}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground">No insurance recommendations available</p>
                  )}
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Insurance information is for reference only. Contact providers for accurate details.
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-auto">
        {!showForm ? (
          <div className="flex space-x-2">
            <Textarea
              placeholder="Describe your health concern..."
              className="flex-1 resize-none"
              disabled={isLoading}
              {...form.register('message')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  form.handleSubmit(handleSubmit)();
                }
              }}
            />
            <div className="flex flex-col space-y-2">
              <Button 
                type="button" 
                onClick={form.handleSubmit(handleSubmit)}
                disabled={isLoading}
                size="icon"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowForm(true)}
                disabled={isLoading}
              >
                +
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 border rounded-lg p-4 bg-card/50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Health Query Details</h3>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  Simple Mode
                </Button>
              </div>
              
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>What symptoms are you experiencing?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your symptoms, concerns, or health questions in detail..."
                        rows={3}
                        className="resize-none"
                        required
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter your age" 
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <FormControl>
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isLoading}
                          {...field}
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (City, Country)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., New York, USA" 
                        disabled={isLoading}
                        {...field} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="medicalHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relevant Medical History (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any relevant medical conditions, allergies, or medications..."
                        rows={2}
                        className="resize-none"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full md:w-auto"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Health Query
                    </>
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                This AI assessment is not a substitute for professional medical advice.
                Always consult with a healthcare provider for medical concerns.
              </p>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
};

export default ElderlyHealthChatbot;
