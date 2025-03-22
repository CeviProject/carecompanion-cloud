
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, Plus, Share, Star } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define TypeScript interface for health tips
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTip, setNewTip] = useState({
    title: '',
    content: '',
    is_public: false
  });

  // Fetch health tips when component mounts
  useEffect(() => {
    if (user) {
      fetchHealthTips();
    }
  }, [user]);

  const fetchHealthTips = async () => {
    try {
      setIsLoading(true);
      // Fetch user's own tips
      const { data: userTips, error: userTipsError } = await supabase
        .from('health_tips')
        .select('*')
        .eq('user_id', user?.id);

      if (userTipsError) throw userTipsError;

      // Fetch public tips from other users
      const { data: publicTips, error: publicTipsError } = await supabase
        .from('health_tips')
        .select('*')
        .eq('is_public', true)
        .not('user_id', 'eq', user?.id);

      if (publicTipsError) throw publicTipsError;

      // Combine and deduplicate tips
      const combinedTips = [...(userTips || []), ...(publicTips || [])];
      const uniqueTips = Array.from(new Map(combinedTips.map(tip => [tip.id, tip])).values());
      
      setHealthTips(uniqueTips as HealthTip[]);
    } catch (error: any) {
      console.error('Error fetching health tips:', error.message);
      toast.error(`Failed to load health tips: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTip = async () => {
    try {
      if (!newTip.title || !newTip.content) {
        toast.error('Please fill in all required fields');
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

      setHealthTips(prev => [...prev, data as HealthTip]);
      setNewTip({ title: '', content: '', is_public: false });
      setIsAddDialogOpen(false);
      toast.success('Health tip added successfully!');
    } catch (error: any) {
      console.error('Error adding health tip:', error.message);
      toast.error(`Failed to add health tip: ${error.message}`);
    }
  };

  const toggleFavorite = async (tipId: string, isFavorite: boolean) => {
    try {
      // Only allow favoriting your own tips
      const tipToUpdate = healthTips.find(tip => tip.id === tipId);
      if (tipToUpdate?.user_id !== user?.id) {
        toast.error('You can only favorite your own health tips');
        return;
      }

      const { error } = await supabase
        .from('health_tips')
        .update({ is_favorite: !isFavorite })
        .eq('id', tipId);

      if (error) throw error;

      setHealthTips(prev => 
        prev.map(tip => 
          tip.id === tipId ? { ...tip, is_favorite: !isFavorite } : tip
        )
      );
      
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error: any) {
      console.error('Error toggling favorite:', error.message);
      toast.error(`Failed to update favorite status: ${error.message}`);
    }
  };

  const generateAITip = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-health-tip', {
        body: { user_id: user?.id }
      });

      if (error) throw error;
      
      if (data && data.success) {
        // Add the generated tip to the database
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
        
        setHealthTips(prev => [...prev, newTip as HealthTip]);
        toast.success('AI-generated health tip added!');
      } else {
        throw new Error(data?.message || 'Failed to generate tip');
      }
    } catch (error: any) {
      console.error('Error generating AI tip:', error.message);
      toast.error(`Failed to generate AI tip: ${error.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Health Tips</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateAITip}>
            Generate AI Tip
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Tip
              </Button>
            </DialogTrigger>
            <DialogContent>
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
            <Card key={tip.id} className={tip.source === 'ai' ? 'border-blue-200' : 'border-gray-200'}>
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
                <CardDescription>
                  {tip.source === 'ai' ? 'AI Generated' : 'Manual Entry'} 
                  {tip.is_public && ' • Public'}
                  {tip.user_id !== user?.id && ' • Shared by others'}
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
