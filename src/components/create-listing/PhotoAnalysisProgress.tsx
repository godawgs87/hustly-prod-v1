
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Camera, Brain, FileText, DollarSign } from 'lucide-react';

const PhotoAnalysisProgress = () => {
  const [progress, setProgress] = React.useState(0);
  const [currentStage, setCurrentStage] = React.useState(0);

  const stages = [
    { icon: Camera, label: 'Compressing images...', duration: 3000 },
    { icon: Brain, label: 'AI analyzing content...', duration: 5000 },
    { icon: FileText, label: 'Generating description...', duration: 3000 },
    { icon: DollarSign, label: 'Researching pricing...', duration: 4000 }
  ];

  React.useEffect(() => {
    const totalDuration = stages.reduce((sum, stage) => sum + stage.duration, 0);
    let elapsed = 0;
    
    const interval = setInterval(() => {
      elapsed += 100;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(newProgress);
      
      // Update current stage
      let accumulatedTime = 0;
      for (let i = 0; i < stages.length; i++) {
        accumulatedTime += stages[i].duration;
        if (elapsed <= accumulatedTime) {
          setCurrentStage(i);
          break;
        }
      }
      
      if (elapsed >= totalDuration) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = stages[currentStage]?.icon || Camera;

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <CurrentIcon className="w-12 h-12 text-blue-500 animate-pulse" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Analyzing Your Photos</h3>
            <p className="text-sm text-gray-600 mt-1">
              {stages[currentStage]?.label || 'Processing...'}
            </p>
          </div>
          
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-gray-500">{Math.round(progress)}% complete</p>
          </div>
          
          <div className="text-xs text-gray-500">
            This may take up to 90 seconds
          </div>
          <div className="text-xs text-gray-400">
            💡 Tip: Use smaller photos (under 2MB) for faster analysis
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PhotoAnalysisProgress;
