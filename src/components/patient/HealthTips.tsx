
import { useState, useEffect } from 'react';
import { PlusCircle, Lightbulb, Save, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HealthTip {
  id: string;
  title: string;
  content: string;
  source: 'ai' | 'manual';
  created_at: string;
  is_favorite: boolean;
}

const HealthTips = () => {
  const { user } = useAuth();
  const [tips, setTips] = useState<HealthTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAddTip, setShowAddTip] = useState(false);
  const [newTipTitle, setNewTipTitle] = useState('');
  const [newTipContent, setNewTipContent] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (user) {
      fetchHealthTips();
    }
  }, [user]);

  const fetchHealthTips = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('health_tips')
        .select('*')
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setTips(data || []);
    } catch (error) {
      console.error('Error fetching health tips:', error);
      toast.error('Failed to load health tips');
    } finally {
      setLoading(false);
    }
  };

  const generateHealthTip = async () => {
    if (!user) {
      toast.error('You must be logged in to generate health tips');
      return;
    }
    
    setGenerating(true);
    
    try {
      // Get user's health queries and info for context
      const { data: healthQueries, error: queriesError } = await supabase
        .from('health_queries')
        .select('query_text, ai_assessment')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (queriesError) throw queriesError;
      
      // Prepare context for AI
      const userContext = {
        queries: healthQueries || [],
      };
      
      // Call the health-tip generator function
      const { data, error } = await supabase.functions.invoke('generate-health-tip', {
        body: { userContext }
      });
      
      if (error) throw error;
      
      if (!data.tip || !data.title) {
        throw new Error('Generated tip is incomplete');
      }
      
      // Save the generated tip
      const { data: savedTip, error: saveError } = await supabase
        .from('health_tips')
        .insert({
          user_id: user.id,
          title: data.title,
          content: data.tip,
          source: 'ai',
          is_public: false,
          is_favorite: false
        })
        .select();
      
      if (saveError) throw saveError;
      
      // Add to state
      if (savedTip && savedTip.length > 0) {
        setTips([savedTip[0], ...tips]);
        toast.success('Generated a new health tip');
      }
    } catch (error) {
      console.error('Error generating health tip:', error);
      toast.error('Failed to generate health tip');
    } finally {
      setGenerating(false);
    }
  };

  const addManualTip = async () => {
    if (!newTipTitle.trim() || !newTipContent.trim()) {
      toast.error('Title and content are required');
      return;
    }
    
    if (!user) {
      toast.error('You must be logged in to add health tips');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('health_tips')
        .insert({
          user_id: user.id,
          title: newTipTitle.trim(),
          content: newTipContent.trim(),
          source: 'manual',
          is_public: false,
          is_favorite: false
        })
        .select();
      
      if (error) throw error;
      
      // Add to state
      if (data && data.length > 0) {
        setTips([data[0], ...tips]);
        toast.success('Added new health tip');
      }
      
      // Reset form and close dialog
      setNewTipTitle('');
      setNewTipContent('');
      setShowAddTip(false);
    } catch (error) {
      console.error('Error adding health tip:', error);
      toast.error('Failed to add health tip');
    }
  };

  const toggleFavorite = async (tipId: string, currentStatus: boolean) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('health_tips')
        .update({ is_favorite: !currentStatus })
        .match({ id: tipId, user_id: user.id });
      
      if (error) throw error;
      
      // Update local state
      setTips(tips.map(tip => 
        tip.id === tipId ? { ...tip, is_favorite: !currentStatus } : tip
      ));
      
      toast.success(currentStatus ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Error toggling favorite status:', error);
      toast.error('Failed to update favorite status');
    }
  };

  const deleteTip = async (tipId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('health_tips')
        .delete()
        .match({ id: tipId, user_id: user.id });
      
      if (error) throw error;
      
      // Remove from local state
      setTips(tips.filter(tip => tip.id !== tipId));
      
      toast.success('Health tip deleted');
    } catch (error) {
      console.error('Error deleting health tip:', error);
      toast.error('Failed to delete health tip');
    }
  };

  // Filter tips based on active tab
  const filteredTips = tips.filter(tip => {
    if (activeTab === 'all') return true;
    if (activeTab === 'ai') return tip.source === 'ai';
    if (activeTab === 'manual') return tip.source === 'manual';
    if (activeTab === 'favorites') return tip.is_favorite;
    return true;
  });

  return (
    <Card className="glass-card p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Health Tips & Recommendations</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={generateHealthTip}
            disabled={generating}
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            {generating ? 'Generating...' : 'AI Tip'}
          </Button>
          <Dialog open={showAddTip} onOpenChange={setShowAddTip}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Tip
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Add New Health Tip</DialogTitle>
                <DialogDescription>
                  Create a personal health tip or reminder
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    Title
                  </label>
                  <Input
                    id="title"
                    value={newTipTitle}
                    onChange={(e) => setNewTipTitle(e.target.value)}
                    placeholder="e.g., Hydration Reminder"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="content" className="text-sm font-medium">
                    Content
                  </label>
                  <Textarea
                    id="content"
                    value={newTipContent}
                    onChange={(e) => setNewTipContent(e.target.value)}
                    placeholder="e.g., Drink at least 8 glasses of water daily to stay hydrated."
                    className="resize-none h-32"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddTip(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={addManualTip}>
                  Save Tip
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="ai">AI Generated</TabsTrigger>
          <TabsTrigger value="manual">My Tips</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-0">
          {loading ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Loading health tips...</p>
            </div>
          ) : filteredTips.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-4">No health tips found</p>
              <div className="flex justify-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={generateHealthTip}
                  disabled={generating}
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Generate AI Tip
                </Button>
                <Button onClick={() => setShowAddTip(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Tip
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTips.map((tip) => (
                <div key={tip.id} className="border rounded-lg p-4 bg-card/50">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{tip.title}</h3>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleFavorite(tip.id, tip.is_favorite)}
                      >
                        {tip.is_favorite ? (
                          <ThumbsUp className="h-4 w-4 text-primary" />
                        ) : (
                          <ThumbsUp className="h-4 w-4" />
                        )}
                      </Button>
                      {tip.source === 'manual' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => deleteTip(tip.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm mt-2">{tip.content}</p>
                  <div className="flex items-center mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5">
                        {tip.source === 'ai' ? 'AI Generated' : 'Manual'}
                      </span>
                      <span>{new Date(tip.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default HealthTips;
