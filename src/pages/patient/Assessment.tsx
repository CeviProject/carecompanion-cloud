
import React, { useState, useEffect } from 'react';
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

const Assessment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [latestQuery, setLatestQuery] = useState<HealthQuery | null>(null);
  const [pastQueries, setPastQueries] = useState<HealthQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('latest');

  useEffect(() => {
    if (user) {
      fetchHealthQueries();
    }
  }, [user]);

  const fetchHealthQueries = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('health_queries')
        .select('*')
        .eq('patient_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setLatestQuery(data[0] as HealthQuery);
        setPastQueries(data.slice(1) as HealthQuery[]);
      }
    } catch (error: any) {
      console.error('Error fetching health queries:', error);
    } finally {
      setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-background">
      <PatientNavbar />
      <div className="container mx-auto py-10 max-w-7xl pt-24">
        <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Health Assessment</h1>
            <p className="text-muted-foreground text-2xl mt-3">
              View your health assessments and recommendations.
            </p>
          </div>
          <Button 
            onClick={handleNewAssessment} 
            size="lg" 
            className="text-xl py-8 px-8 rounded-xl"
          >
            New Assessment
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="mb-8 p-2 text-xl">
            <TabsTrigger value="latest" className="text-xl px-8 py-4">Latest Assessment</TabsTrigger>
            <TabsTrigger value="history" className="text-xl px-8 py-4">Assessment History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="latest">
            {isLoading ? (
              <Card className="animate-pulse shadow-lg">
                <CardHeader>
                  <div className="h-10 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ) : latestQuery ? (
              <HealthAssessment assessment={latestQuery.ai_assessment} queryData={latestQuery} />
            ) : (
              <Card className="shadow-lg border-2">
                <CardContent className="flex flex-col items-center justify-center py-20 space-y-8">
                  <FileText className="h-28 w-28 text-gray-400" />
                  <p className="text-center text-gray-600 text-2xl">No health assessments found. Start your first assessment now.</p>
                  <Button 
                    onClick={handleNewAssessment}
                    size="lg"
                    className="text-xl py-8 px-10 rounded-xl"
                  >
                    Get Your First Assessment
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="history">
            {isLoading ? (
              <div className="grid gap-8">
                {[1, 2].map(i => (
                  <Card key={i} className="animate-pulse shadow-lg">
                    <CardHeader>
                      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-7 bg-gray-200 rounded w-2/3 mb-4"></div>
                      <div className="h-7 bg-gray-200 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pastQueries.length > 0 ? (
              <div className="grid gap-8">
                {pastQueries.map(query => (
                  <Card 
                    key={query.id} 
                    className="hover:shadow-xl transition-shadow cursor-pointer shadow-md border-2"
                    onClick={() => handleViewQuery(query)}
                  >
                    <CardHeader className="pb-4">
                      <CardTitle className="text-2xl">
                        Health Query on {format(new Date(query.created_at), 'MMMM d, yyyy')}
                      </CardTitle>
                      <CardDescription className="flex items-center text-xl">
                        <Clock className="h-6 w-6 mr-2" /> 
                        {format(new Date(query.created_at), 'h:mm a')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="line-clamp-2 text-gray-700 text-xl">{query.query_text}</p>
                      <div className="flex items-center justify-between mt-6">
                        <div className="flex items-center space-x-3 text-xl text-gray-500">
                          <Calendar className="h-6 w-6" />
                          <span>{format(new Date(query.created_at), 'MMM d, yyyy')}</span>
                        </div>
                        <Button variant="outline" size="lg" className="text-xl py-6 px-6">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="shadow-lg border-2">
                <CardContent className="py-20 text-center text-gray-600 text-2xl">
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
