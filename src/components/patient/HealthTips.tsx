
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, Plus, Share, Star, RefreshCw, Lightbulb } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface HealthTip {
  id: string;
  user_id: string;
  title: string;
  content: string;
  source: string;
  is_public: boolean;
  is_favorite: boolean;
  created_at: string;
}

const HealthTips = () => {
  const { user } = useAuth();
  const [healthTips, setHealthTips] = useState<HealthTip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingGeneral, setIsGeneratingGeneral] = useState(false);
  const [isGeneratingContextual, setIsGeneratingContextual] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTip, setNewTip] = useState({
    title: '',
    content: '',
    is_public: false
  });
  const [publicTipsCount, setPublicTipsCount] = useState(0);
  const [recentHealthIssues, setRecentHealthIssues] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchHealthTips();
      fetchRecentHealthIssues();
      
      const channel = supabase
        .channel('health-tips-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'health_tips'
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              if (payload.new.is_public || payload.new.user_id === user.id) {
                setHealthTips(prev => {
                  if (!prev.some(tip => tip.id === payload.new.id)) {
                    return [payload.new as HealthTip, ...prev];
                  }
                  return prev;
                });
                
                if (payload.new.is_public && payload.new.user_id !== user.id) {
                  toast({
                    title: "New tip available!",
                    description: "A new public health tip has been shared.",
                    variant: "default",
                  });
                }
              }
            } else if (payload.eventType === 'UPDATE') {
              setHealthTips(prev => 
                prev.map(tip => tip.id === payload.new.id ? payload.new as HealthTip : tip)
              );
            } else if (payload.eventType === 'DELETE') {
              setHealthTips(prev => prev.filter(tip => tip.id !== payload.old.id));
            }
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    const publicTips = healthTips.filter(tip => tip.is_public);
    setPublicTipsCount(publicTips.length);
  }, [healthTips]);

  const fetchHealthTips = async () => {
    try {
      setIsLoading(true);
      const { data: userTips, error: userTipsError } = await supabase
        .from('health_tips')
        .select('*')
        .eq('user_id', user?.id);

      if (userTipsError) throw userTipsError;

      const { data: publicTips, error: publicTipsError } = await supabase
        .from('health_tips')
        .select('*')
        .eq('is_public', true)
        .not('user_id', 'eq', user?.id);

      if (publicTipsError) throw publicTipsError;

      const combinedTips = [...(userTips || []), ...(publicTips || [])];
      const uniqueTips = Array.from(new Map(combinedTips.map(tip => [tip.id, tip])).values());
      
      setHealthTips(uniqueTips as HealthTip[]);
    } catch (error: any) {
      console.error('Error fetching health tips:', error.message);
      toast({
        title: "Error",
        description: `Failed to load health tips: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentHealthIssues = async () => {
    try {
      console.log('Fetching recent health issues for user:', user?.id);
      const { data, error } = await supabase
        .from('health_queries')
        .select('query_text, patient_data, ai_assessment')
        .eq('patient_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      console.log('Health queries data received:', data);
      
      if (data && data.length > 0) {
        const issues = data.map(item => {
          // First, try to get symptoms from patient_data
          if (item.patient_data && typeof item.patient_data === 'object') {
            if ('symptoms' in item.patient_data) {
              return (item.patient_data as any).symptoms;
            }
          }
          
          // Next, try to extract from AI assessment
          if (item.ai_assessment && typeof item.ai_assessment === 'object') {
            if ('assessment' in item.ai_assessment) {
              return (item.ai_assessment as any).assessment;
            }
            // If there's a reasonable string alternative, use that
            const assessmentStr = JSON.stringify(item.ai_assessment);
            if (assessmentStr.length < 200) {
              return assessmentStr;
            }
          }
          
          // Fallback to query text
          return item.query_text;
        });
        
        console.log('Processed health issues:', issues);
        setRecentHealthIssues(issues);
      } else {
        console.log('No recent health queries found');
      }
    } catch (error: any) {
      console.error('Error fetching recent health issues:', error.message);
    }
  };

  const handleAddTip = async () => {
    try {
      if (!newTip.title || !newTip.content) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('health_tips')
        .insert({
          user_id: user?.id,
          title: newTip.title,
          content: newTip.content,
          source: 'manual',
          is_public: newTip.is_public,
          is_favorite: false
        })
        .select('*')
        .single();

      if (error) throw error;

      setNewTip({ title: '', content: '', is_public: false });
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Health tip added successfully!",
        variant: "default",
      });
      
      if (newTip.is_public) {
        sendTipNotification(data as HealthTip, 'added');
      }
    } catch (error: any) {
      console.error('Error adding health tip:', error.message);
      toast({
        title: "Error",
        description: `Failed to add health tip: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const toggleFavorite = async (tipId: string, isFavorite: boolean) => {
    try {
      const tipToUpdate = healthTips.find(tip => tip.id === tipId);
      if (tipToUpdate?.user_id !== user?.id) {
        toast({
          title: "Permission Error",
          description: "You can only favorite your own health tips",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('health_tips')
        .update({ is_favorite: !isFavorite })
        .eq('id', tipId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: isFavorite ? 'Removed from favorites' : 'Added to favorites',
        variant: "default",
      });
    } catch (error: any) {
      console.error('Error toggling favorite:', error.message);
      toast({
        title: "Error",
        description: `Failed to update favorite status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const generateAITip = async () => {
    try {
      setIsGeneratingGeneral(true);
      
      const contextData = {
        user_id: user?.id,
        recentIssues: []
      };
      
      toast({
        title: "Generating tip",
        description: "Creating a general health tip...",
        variant: "default",
      });
      
      // Get the current session to access the JWT token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError.message);
        throw new Error('Authentication error: ' + sessionError.message);
      }
      
      if (!sessionData.session?.access_token) {
        console.error('No access token available');
        throw new Error('No authentication token available. Please log in again.');
      }
      
      console.log('Invoking generate-health-tip function with auth token');
      
      const { data, error } = await supabase.functions.invoke('generate-health-tip', {
        body: contextData,
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });
      
      console.log('Function response:', data, error);

      if (error) {
        console.error('Function error details:', error);
        throw error;
      }
      
      if (data && data.success) {
        const { data: newTip, error: insertError } = await supabase
          .from('health_tips')
          .insert({
            user_id: user?.id,
            title: data.tip.title || 'AI Generated Tip',
            content: data.tip.content,
            source: 'ai',
            is_public: false,
            is_favorite: false
          })
          .select('*')
          .single();
          
        if (insertError) throw insertError;
        
        toast({
          title: "Success",
          description: "AI-generated health tip added!",
          variant: "default",
        });
      } else {
        throw new Error(data?.message || 'Failed to generate tip');
      }
    } catch (error: any) {
      console.error('Error generating AI tip:', error.message);
      toast({
        title: "Error",
        description: `Failed to generate AI tip: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingGeneral(false);
    }
  };

  const generateContextualTip = async () => {
    try {
      setIsGeneratingContextual(true);
      
      if (recentHealthIssues.length === 0) {
        toast({
          title: "Info",
          description: "No recent health issues found. Generating general health tip instead.",
          variant: "default",
        });
      } else {
        toast({
          title: "Generating personalized tip",
          description: "Creating a tip based on your recent health concerns...",
          variant: "default",
        });
      }
      
      const contextData = {
        user_id: user?.id,
        recentIssues: recentHealthIssues.length > 0 ? recentHealthIssues : []
      };
      
      // Get the current session to access the JWT token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError.message);
        throw new Error('Authentication error: ' + sessionError.message);
      }
      
      if (!sessionData.session?.access_token) {
        console.error('No access token available');
        throw new Error('No authentication token available. Please log in again.');
      }
      
      console.log('Invoking generate-health-tip function with auth token and context data:', 
        JSON.stringify(contextData).substring(0, 200));
      
      const { data, error } = await supabase.functions.invoke('generate-health-tip', {
        body: contextData,
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });
      
      console.log('Function response:', data);

      if (error) {
        console.error('Function error details:', error);
        throw error;
      }
      
      if (data && data.success) {
        const { data: newTip, error: insertError } = await supabase
          .from('health_tips')
          .insert({
            user_id: user?.id,
            title: data.tip.title || 'Personalized Health Tip',
            content: data.tip.content,
            source: 'ai_contextual',
            is_public: false,
            is_favorite: false
          })
          .select('*')
          .single();
          
        if (insertError) throw insertError;
        
        toast({
          title: "Success",
          description: "Personalized health tip created based on your health history!",
          variant: "default",
        });
      } else {
        throw new Error(data?.message || 'Failed to generate personalized tip');
      }
    } catch (error: any) {
      console.error('Error generating contextual tip:', error.message);
      toast({
        title: "Error",
        description: `Failed to generate personalized tip: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingContextual(false);
    }
  };

  const sendTipNotification = async (tip: HealthTip, action: 'added' | 'updated') => {
    if (!user?.email) return;
    
    try {
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'email',
          recipient: user.email,
          subject: `Health Tip ${action === 'added' ? 'Shared' : 'Updated'}`,
          message: `
            <h3>${tip.title}</h3>
            <p>${tip.content}</p>
            <p>This tip is now public and visible to other users.</p>
          `
        }
      });
    } catch (error) {
      console.error('Error sending tip notification:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Health Tips</h2>
        <div className="flex gap-2">
          {publicTipsCount > 0 && (
            <span className="ml-2 text-sm bg-primary/10 px-2 py-1 rounded-full">
              {publicTipsCount} Public Tips
            </span>
          )}
          <Button 
            variant="outline" 
            onClick={generateContextualTip} 
            disabled={isGeneratingContextual || isGeneratingGeneral}
            className="bg-gradient-to-r from-indigo-100 to-purple-100 hover:from-indigo-200 hover:to-purple-200"
          >
            {isGeneratingContextual ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Personalizing...
              </>
            ) : (
              <>
                <Lightbulb className="mr-2 h-4 w-4 text-indigo-600" />
                Personalized Tip
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={generateAITip} 
            disabled={isGeneratingGeneral || isGeneratingContextual}
          >
            {isGeneratingGeneral ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>General AI Tip</>
            )}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Tip
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Health Tip</DialogTitle>
                <DialogDescription>
                  Share your health knowledge with others or keep it for yourself.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input 
                    id="title" 
                    value={newTip.title}
                    onChange={(e) => setNewTip({...newTip, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea 
                    id="content" 
                    rows={5}
                    value={newTip.content}
                    onChange={(e) => setNewTip({...newTip, content: e.target.value})}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="public"
                    checked={newTip.is_public}
                    onCheckedChange={(checked) => setNewTip({...newTip, is_public: checked})}
                  />
                  <Label htmlFor="public">Make this tip public</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddTip}>Add Tip</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-12 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : healthTips.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <p className="text-center text-gray-500">No health tips found. Add your first tip or generate one with AI!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {healthTips.map((tip) => (
            <Card 
              key={tip.id} 
              id={`tip-${tip.id}`} 
              className={`transition-all duration-300 hover:shadow-md ${
                tip.source === 'ai' ? 'border-blue-200' : 
                tip.source === 'ai_contextual' ? 'border-purple-200' : 'border-gray-200'
              } ${tip.is_favorite ? 'bg-amber-50' : ''}`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="mr-8">{tip.title}</CardTitle>
                  {tip.user_id === user?.id && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => toggleFavorite(tip.id, tip.is_favorite)}
                    >
                      {tip.is_favorite ? (
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <Star className="h-5 w-5 text-gray-400" />
                      )}
                    </Button>
                  )}
                </div>
                <CardDescription className="flex flex-wrap gap-2 mt-1">
                  {tip.source === 'ai' && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">AI Generated</span>
                  )}
                  {tip.source === 'ai_contextual' && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs">Personalized</span>
                  )}
                  {tip.source === 'manual' && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs">Manual</span>
                  )}
                  {tip.is_public && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">Public</span>
                  )}
                  {tip.user_id !== user?.id && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">Shared</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{tip.content}</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <p className="text-xs text-gray-500">
                  {new Date(tip.created_at).toLocaleDateString()}
                </p>
                {tip.user_id === user?.id && tip.is_public && (
                  <Button size="sm" variant="ghost">
                    <Share className="h-4 w-4 mr-1" /> Shared
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HealthTips;
