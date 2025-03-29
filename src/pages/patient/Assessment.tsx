
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from "@/components/ui/button";
import HealthAssessment, { HealthQuery } from '@/components/patient/HealthAssessment';
import PatientNavbar from '@/components/patient/PatientNavbar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Assessment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [latestQuery, setLatestQuery] = useState<HealthQuery | null>(null);
  const [pastQueries, setPastQueries] = useState<HealthQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('latest');
  const [dataFetched, setDataFetched] = useState(false);
  const fetchInProgress = useRef(false);

  useEffect(() => {
    if (user && !dataFetched && !fetchInProgress.current) {
      fetchHealthQueries();
    }
  }, [user, dataFetched]);

  const fetchHealthQueries = async () => {
    try {
      // Prevent multiple simultaneous fetch requests
      if (fetchInProgress.current) return;
      fetchInProgress.current = true;
      
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('health_queries')
        .select('*')
        .eq('patient_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching health queries:', error);
        toast.error('Failed to fetch your health assessments');
        throw error;
      }

      if (data && data.length > 0) {
        console.log('Fetched health queries:', data);
        setLatestQuery(data[0] as HealthQuery);
        setPastQueries(data.slice(1) as HealthQuery[]);
      } else {
        console.log('No health queries found');
        setLatestQuery(null);
        setPastQueries([]);
      }
      
      setDataFetched(true);
    } catch (error: any) {
      console.error('Error in fetchHealthQueries:', error);
    } finally {
      setIsLoading(false);
      fetchInProgress.current = false;
    }
  };

  const handleNewAssessment = () => {
    navigate('/patient/health-query');
  };

  const handleViewQuery = (query: HealthQuery) => {
    setLatestQuery(query);
    setActiveTab('latest');
    window.scrollTo(0, 0);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-6 max-w-7xl pt-20">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Health Assessment</h1>
            <p className="text-muted-foreground">
              View your health assessments and recommendations.
            </p>
          </div>
          <Button onClick={handleNewAssessment}>
            New Assessment
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="latest">Latest Assessment</TabsTrigger>
            <TabsTrigger value="history">Assessment History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="latest">
            {isLoading ? (
              <Card className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-40 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ) : latestQuery ? (
              <HealthAssessment 
                assessment={latestQuery.ai_assessment} 
                queryData={latestQuery} 
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
                  <FileText className="h-16 w-16 text-gray-400" />
                  <p className="text-center text-gray-500">No health assessments found. Start your first assessment now.</p>
                  <Button onClick={handleNewAssessment}>
                    Get Your First Assessment
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="history">
            {isLoading ? (
              <div className="grid gap-4">
                {[1, 2].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pastQueries.length > 0 ? (
              <div className="grid gap-4">
                {pastQueries.map(query => (
                  <Card 
                    key={query.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewQuery(query)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        Health Query on {format(new Date(query.created_at), 'MMMM d, yyyy')}
                      </CardTitle>
                      <CardDescription className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" /> 
                        {format(new Date(query.created_at), 'h:mm a')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="line-clamp-2 text-gray-700">{query.query_text}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(query.created_at), 'MMM d, yyyy')}</span>
                        </div>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-gray-500">
                  <p>No previous assessments found.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Assessment;
