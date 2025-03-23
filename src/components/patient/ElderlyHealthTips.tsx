
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ElderlyTip {
  title: string;
  content: string;
  category?: string;
}

const ElderlyHealthTips = () => {
  const { user } = useAuth();
  const [tip, setTip] = useState<ElderlyTip | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentHealthIssues, setRecentHealthIssues] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchRecentHealthIssues();
      generateTip();
    }
  }, [user]);

  const fetchRecentHealthIssues = async () => {
    try {
      const { data, error } = await supabase
        .from('health_queries')
        .select('query_text, patient_data, ai_assessment')
        .eq('patient_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const issues = data.map(item => {
          let issueText = item.query_text || '';
          
          if (item.ai_assessment) {
            try {
              let assessment;
              if (typeof item.ai_assessment === 'string') {
                try {
                  assessment = JSON.parse(item.ai_assessment);
                } catch (e) {
                  assessment = item.ai_assessment;
                }
              } else {
                assessment = item.ai_assessment;
              }
              
              if (assessment && typeof assessment === 'object') {
                if (assessment.assessment) {
                  issueText = assessment.assessment.toString().substring(0, 200);
                } else if (assessment.condition) {
                  issueText = assessment.condition.toString().substring(0, 200);
                }
              }
            } catch (e) {
              console.log('Error parsing AI assessment:', e);
            }
          }
          
          return issueText;
        }).filter(Boolean);
        
        setRecentHealthIssues(issues);
      }
    } catch (error: any) {
      console.error('Error fetching recent health issues:', error.message);
    }
  };

  const generateTip = async () => {
    try {
      setIsLoading(true);
      
      // Ensure we have the latest health issues
      await fetchRecentHealthIssues();
      
      const contextData = {
        user_id: user?.id,
        recentIssues: recentHealthIssues,
        demographic: "elderly" // Specify that the tips should be relevant for elderly patients
      };
      
      // Get the current session to access the JWT token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Authentication error: ' + sessionError.message);
      }
      
      if (!sessionData || !sessionData.session?.access_token) {
        throw new Error('No authentication token available. Please log in again.');
      }
      
      const { data, error } = await supabase.functions.invoke('generate-elderly-tip', {
        body: JSON.stringify(contextData),
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (error) {
        console.error('Function error details:', error);
        throw error;
      }
      
      if (data && data.success && data.tip) {
        setTip(data.tip);
        toast({
          title: "New tip generated",
          description: "A new health tip for elderly care has been generated.",
          variant: "default",
        });
      } else {
        throw new Error(data?.message || 'Failed to generate tip');
      }
    } catch (error: any) {
      console.error('Error generating elderly tip:', error.message);
      toast({
        title: "Error",
        description: `Failed to generate tip: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Elderly Health Tips</h2>
        <Button 
          variant="outline" 
          onClick={generateTip} 
          disabled={isLoading}
          className="bg-gradient-to-r from-blue-100 to-green-100 hover:from-blue-200 hover:to-green-200"
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate New Tip
            </>
          )}
        </Button>
      </div>

      {!tip && !isLoading && (
        <Card>
          <CardContent className="py-10">
            <p className="text-center text-gray-500">No tips generated yet. Click "Generate New Tip" to get started.</p>
          </CardContent>
        </Card>
      )}

      {tip && (
        <Card className="transition-all duration-300 hover:shadow-md border-t-4 border-t-green-500">
          <CardHeader>
            <CardTitle className="text-xl text-green-800">{tip.title}</CardTitle>
            {tip.category && (
              <CardDescription className="text-green-600">
                {tip.category}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line">{tip.content}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ElderlyHealthTips;
