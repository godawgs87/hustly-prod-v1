import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StyleAnalysisResult {
  status: string;
  training_data_count: number;
  confidence_score: number;
  style_metrics: any;
}

interface PersonalizedContent {
  title: string;
  description: string;
  pricing_suggestion: number;
  keywords: string[];
  confidence_score: number;
  personalization_applied: boolean;
}

export const useAIPersonalization = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const analyzeUserStyle = useCallback(async (): Promise<StyleAnalysisResult | null> => {
    try {
      setAnalyzing(true);
      
      const { data, error } = await supabase.functions.invoke('ai-style-analysis', {
        body: { action: 'analyze_user_style' }
      });

      if (error) throw error;

      if (data.status === 'insufficient_data') {
        toast({
          title: "Insufficient Training Data",
          description: `Need at least 5 successful listings to analyze style. Currently have ${data.training_data_count}.`,
          variant: "destructive"
        });
        return null;
      }

      toast({
        title: "Style Analysis Complete",
        description: `Analyzed ${data.training_data_count} listings with ${Math.round(data.confidence_score * 100)}% confidence.`
      });

      return data;
    } catch (error: any) {
      console.error('Style analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || 'Failed to analyze user style patterns',
        variant: "destructive"
      });
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, [toast]);

  const generatePersonalizedContent = useCallback(async (listingData: any): Promise<PersonalizedContent | null> => {
    try {
      setGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('ai-style-analysis', {
        body: { 
          action: 'generate_content',
          listingData 
        }
      });

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Content generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error.message || 'Failed to generate personalized content',
        variant: "destructive"
      });
      return null;
    } finally {
      setGenerating(false);
    }
  }, [toast]);

  const importTrainingData = useCallback(async (trainingData: any[]): Promise<boolean> => {
    try {
      setImporting(true);
      
      const { data, error } = await supabase.functions.invoke('ai-style-analysis', {
        body: { 
          action: 'import_training_data',
          trainingData 
        }
      });

      if (error) throw error;

      toast({
        title: "Training Data Imported",
        description: `Successfully imported ${data.imported_count} listings for AI training.`
      });

      return true;
    } catch (error: any) {
      console.error('Training data import failed:', error);
      toast({
        title: "Import Failed",
        description: error.message || 'Failed to import training data',
        variant: "destructive"
      });
      return false;
    } finally {
      setImporting(false);
    }
  }, [toast]);

  return {
    analyzeUserStyle,
    generatePersonalizedContent,
    importTrainingData,
    analyzing,
    generating,
    importing
  };
};