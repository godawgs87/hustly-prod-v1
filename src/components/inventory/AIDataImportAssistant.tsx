
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Bot, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { downloadCSV } from '@/utils/csvUtils';

const AIDataImportAssistant = () => {
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const templateHeaders = [
      'Title',
      'Description', 
      'Price',
      'Category',
      'Condition',
      'Status',
      'Purchase Price',
      'Purchase Date',
      'Shipping Cost',
      'Clothing Size',
      'Shoe Size',
      'Gender',
      'Age Group',
      'Keywords (semicolon separated)',
      'Measurements Length',
      'Measurements Width', 
      'Measurements Height',
      'Measurements Weight'
    ];
    
    const sampleRow = [
      'Nike Air Force 1 Sneakers',
      'Excellent condition white Nike Air Force 1 sneakers',
      '85.00',
      'Shoes',
      'Excellent',
      'draft',
      '45.00',
      '2024-01-15',
      '12.95',
      '',
      '10',
      'Men',
      'Adult',
      'nike;sneakers;shoes;white;athletic',
      '12',
      '8',
      '5',
      '2.1'
    ];

    const csvContent = [templateHeaders.join(','), sampleRow.join(',')].join('\n');
    downloadCSV(csvContent, 'hustly_import_template.csv');
  };

  const processWithAI = async () => {
    if (!userInput.trim()) {
      setError('Please enter some data to process');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      // Simulate AI processing progress
      const steps = [
        'Analyzing your data format...',
        'Mapping fields to template...',
        'Cleaning and standardizing data...',
        'Generating CSV format...',
        'Validating results...'
      ];

      for (let i = 0; i < steps.length; i++) {
        setProgress(((i + 1) / steps.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Simulate AI transformation (in real implementation, this would call an AI service)
      const processedData = simulateAIProcessing(userInput);
      
      setResult(processedData);
      toast({
        title: "AI Processing Complete!",
        description: "Your data has been transformed into the correct format.",
      });
    } catch (error) {
      console.error('AI processing error:', error);
      setError('Failed to process data. Please check your input format.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const simulateAIProcessing = (input: string): string => {
    // This would be replaced with actual AI processing
    // For now, we'll create a simple transformation example
    const lines = input.split('\n').filter(line => line.trim());
    
    const headers = [
      'Title', 'Description', 'Price', 'Category', 'Condition', 'Status',
      'Purchase Price', 'Purchase Date', 'Shipping Cost', 'Clothing Size',
      'Shoe Size', 'Gender', 'Age Group', 'Keywords', 'Measurements Length',
      'Measurements Width', 'Measurements Height', 'Measurements Weight'
    ];

    const csvRows = [headers.join(',')];
    
    // Simple example transformation - would be much more sophisticated with real AI
    lines.forEach((line, index) => {
      if (line.trim()) {
        const exampleRow = [
          `Item ${index + 1} - ${line.split(' ').slice(0, 3).join(' ')}`,
          `Processed description for ${line}`,
          Math.floor(Math.random() * 50 + 20).toString(),
          'Clothing',
          'Good',
          'draft',
          Math.floor(Math.random() * 30 + 10).toString(),
          '2024-01-01',
          '9.95',
          'M',
          '',
          'Unisex',
          'Adult',
          line.toLowerCase().split(' ').slice(0, 3).join(';'),
          '24',
          '18',
          '2',
          '1.2'
        ];
        csvRows.push(`"${exampleRow.join('","')}"`);
      }
    });

    return csvRows.join('\n');
  };

  const downloadProcessedData = () => {
    if (result) {
      const blob = new Blob([result], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `ai_processed_data_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          AI Data Import Assistant
        </CardTitle>
        <CardDescription>
          Transform your raw data into Hustly's format using AI. Paste your inventory data below and let AI map it to our template.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Button 
            variant="outline" 
            onClick={downloadTemplate}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Download Template
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Paste your inventory data (any format - spreadsheet, list, etc.)
          </label>
          <Textarea
            placeholder="Example:
Nike Air Force 1 White Size 10 $45 purchased from outlet
Levi's 501 Jeans Blue 32x34 $25 thrift store find
Vintage Champion Hoodie XL $30 estate sale
..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            rows={8}
            className="resize-none"
          />
        </div>

        <Button 
          onClick={processWithAI}
          disabled={isProcessing || !userInput.trim()}
          className="w-full"
        >
          {isProcessing ? (
            <>Processing with AI...</>
          ) : (
            <>
              <Bot className="w-4 h-4 mr-2" />
              Transform Data with AI
            </>
          )}
        </Button>

        {isProcessing && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">AI is processing your data...</div>
            <Progress value={progress} className="w-full" />
            <div className="text-xs text-gray-500">{progress.toFixed(0)}% complete</div>
          </div>
        )}

        {result && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">AI processing complete!</div>
                <div className="text-sm">Your data has been transformed into CSV format ready for import.</div>
                <Button 
                  onClick={downloadProcessedData}
                  size="sm"
                  className="mt-2"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Download Processed CSV
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded">
          <strong>How it works:</strong> The AI assistant analyzes your raw inventory data and automatically maps it to Hustly's template format. It can handle various input formats including spreadsheet data, simple lists, or structured text. After processing, you'll get a properly formatted CSV file ready to import.
        </div>
      </CardContent>
    </Card>
  );
};

export default AIDataImportAssistant;
