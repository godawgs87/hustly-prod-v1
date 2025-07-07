
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { ListingData } from '@/types/CreateListing';

interface KeywordsSectionProps {
  listingData: ListingData;
  onUpdate: (updates: Partial<ListingData>) => void;
}

const KeywordsSection = ({ listingData, onUpdate }: KeywordsSectionProps) => {
  const [newKeyword, setNewKeyword] = useState('');

  const addKeyword = () => {
    if (newKeyword.trim()) {
      const currentKeywords = listingData.keywords || [];
      onUpdate({ keywords: [...currentKeywords, newKeyword.trim()] });
      setNewKeyword('');
    }
  };

  const removeKeyword = (index: number) => {
    const currentKeywords = listingData.keywords || [];
    onUpdate({ keywords: currentKeywords.filter((_, i) => i !== index) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keywords (Optional)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(listingData.keywords || []).map((keyword, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {keyword}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-red-500" 
                onClick={() => removeKeyword(index)}
              />
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Add keyword..."
            onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
          />
          <Button type="button" onClick={addKeyword} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default KeywordsSection;
