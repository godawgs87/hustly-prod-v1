
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X } from 'lucide-react';

interface InlineEditableFieldProps {
  label: string;
  value: string | number;
  type?: 'text' | 'textarea' | 'number' | 'select';
  options?: string[];
  onSave: (value: string | number) => void;
  className?: string;
  displayClassName?: string;
}

const InlineEditableField = ({ 
  label, 
  value, 
  type = 'text', 
  options = [],
  onSave, 
  className = '',
  displayClassName = ''
}: InlineEditableFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={handleSave} className="h-6 w-6 p-0">
              <Check className="w-3 h-3 text-green-600" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} className="h-6 w-6 p-0">
              <X className="w-3 h-3 text-red-600" />
            </Button>
          </div>
        </div>
        
        {type === 'textarea' ? (
          <Textarea
            value={editValue as string}
            onChange={(e) => setEditValue(e.target.value)}
            rows={3}
            className="w-full"
          />
        ) : type === 'select' ? (
          <Select value={editValue as string} onValueChange={setEditValue}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
            className="w-full"
          />
        )}
      </div>
    );
  }

  return (
    <div className={`group flex items-start gap-2 ${className}`}>
      <div className="flex-1">
        <div className="text-sm text-gray-500 mb-1">{label}</div>
        <div className={`${displayClassName}`}>
          {type === 'number' && typeof value === 'number' ? `$${value}` : value}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
      >
        <Pencil className="w-3 h-3" />
      </Button>
    </div>
  );
};

export default InlineEditableField;
