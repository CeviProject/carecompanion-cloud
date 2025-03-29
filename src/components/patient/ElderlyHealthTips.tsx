
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      
      // Only generate a tip if we don't already have one
      const storedTip = localStorage.getItem('elderlyHealthTip');
      if (storedTip) {
        try {
          setTip(JSON.parse(storedTip));
        } catch (e) {
          console.error('Error parsing stored tip:', e);
          // If parsing fails, generate a new tip
          generateTip();
        }
      } else {
        generateTip();
      }
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
      
      // Create a simple tip directly in the frontend for now to avoid edge function errors
      // This is a temporary solution until the edge function issues are resolved
      const sampleTips = [
        {
          title: "Stay Hydrated",
          content: "As we age, our sense of thirst diminishes. Remember to drink water regularly throughout the day, even when not feeling thirsty. Aim for 6-8 glasses daily, and increase intake during hot weather or physical activity.",
          category: "Hydration"
        },
        {
          title: "Fall-Proof Your Home",
          content: "Remove trip hazards like loose rugs and cords. Install grab bars in bathrooms, ensure good lighting, and consider night lights in hallways. These simple changes significantly reduce fall risk, a common concern for seniors.",
          category: "Safety"
        },
        {
          title: "Medication Management",
          content: "Use pill organizers and set alarms to remember medication times. Keep an updated list of all medications, including over-the-counter drugs and supplements, to share with healthcare providers during appointments.",
          category: "Medication"
        },
        {
          title: "Stay Socially Active",
          content: "Regular social interaction helps maintain cognitive function and emotional wellbeing. Join community groups, schedule regular video calls with family, or consider volunteering. Even brief daily social connections benefit mental health.",
          category: "Mental Health"
        },
        {
          title: "Gentle Daily Exercise",
          content: "Even 15-30 minutes of gentle movement daily improves circulation, joint mobility, and mood. Consider chair exercises, walking, tai chi, or water aerobics—all excellent low-impact options that help maintain independence and prevent falls.",
          category: "Exercise"
        }
      ];
      
      // Select a random tip
      const randomTip = sampleTips[Math.floor(Math.random() * sampleTips.length)];
      
      setTip(randomTip);
      
      // Store the tip in localStorage to persist it between sessions
      localStorage.setItem('elderlyHealthTip', JSON.stringify(randomTip));
      
      toast({
        title: "New tip generated",
        description: "A new health tip for elderly care has been generated.",
      });
      
    } catch (error: any) {
      console.error('Error generating elderly tip:', error.message);
      toast.error(`Failed to generate tip: ${error.message}`);
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
