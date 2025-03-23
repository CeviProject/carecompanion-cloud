
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
      
      // Using direct fetch instead of supabase functions to avoid Edge Function errors
      const SUPABASE_URL = "https://irkihiedlszoufsjglhw.supabase.co";
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-elderly-tip`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contextData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to generate tip response:', errorText);
        
        // Provide a fallback tip when the API fails
        const fallbackTip = {
          title: "Stay Hydrated",
          content: "As we age, our sense of thirst may decrease. Remember to drink water regularly throughout the day, even when not feeling thirsty. Proper hydration helps maintain energy levels, supports kidney function, and can prevent confusion. Keep a water bottle within easy reach at all times.",
          category: "Wellness"
        };
        
        setTip(fallbackTip);
        
        throw new Error(`Failed to generate tip: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
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
        title: "Note",
        description: `Using a pre-saved health tip due to temporary service issue.`,
        variant: "default",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Health Tips</h2>
        <Button 
          variant="outline" 
          onClick={generateTip} 
          disabled={isLoading}
          className="bg-gradient-to-r from-blue-100 to-green-100 hover:from-blue-200 hover:to-green-200 text-xl py-7 px-8 rounded-xl"
          size="lg"
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-4 h-6 w-6 animate-spin" />
              <span className="text-xl">Generating...</span>
            </>
          ) : (
            <>
              <RefreshCw className="mr-4 h-6 w-6" />
              <span className="text-xl">New Tip</span>
            </>
          )}
        </Button>
      </div>

      {!tip && !isLoading && (
        <Card className="shadow-lg border-2">
          <CardContent className="py-16">
            <p className="text-center text-gray-500 text-2xl">No tips generated yet. Click "New Tip" to get started.</p>
          </CardContent>
        </Card>
      )}

      {tip && (
        <Card className="transition-all duration-300 hover:shadow-xl border-t-4 border-t-green-500 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-3xl text-green-800">{tip.title}</CardTitle>
            {tip.category && (
              <CardDescription className="text-green-600 text-xl">
                {tip.category}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-2xl leading-relaxed">{tip.content}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ElderlyHealthTips;
