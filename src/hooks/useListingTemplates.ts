
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ListingTemplate {
  id: string;
  name: string;
  category: string;
  template: any;
  isCustom?: boolean;
  createdAt: string;
}

export const useListingTemplates = () => {
  const [templates, setTemplates] = useState<ListingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load templates from localStorage on mount
  useEffect(() => {
    try {
      const savedTemplates = localStorage.getItem('listingTemplates');
      if (savedTemplates) {
        setTemplates(JSON.parse(savedTemplates));
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save templates to localStorage whenever templates change
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem('listingTemplates', JSON.stringify(templates));
      } catch (error) {
        console.error('Error saving templates:', error);
      }
    }
  }, [templates, loading]);

  const createTemplate = (templateData: Omit<ListingTemplate, 'id' | 'createdAt'>) => {
    const newTemplate: ListingTemplate = {
      ...templateData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      isCustom: true
    };

    setTemplates(prev => [...prev, newTemplate]);
    
    toast({
      title: "Template Created",
      description: `"${newTemplate.name}" template has been saved.`
    });

    return newTemplate;
  };

  const updateTemplate = (id: string, updates: Partial<ListingTemplate>) => {
    setTemplates(prev => prev.map(template => 
      template.id === id ? { ...template, ...updates } : template
    ));

    toast({
      title: "Template Updated",
      description: "Your template has been updated successfully."
    });
  };

  const deleteTemplate = (id: string) => {
    const template = templates.find(t => t.id === id);
    if (!template) return;

    setTemplates(prev => prev.filter(t => t.id !== id));
    
    toast({
      title: "Template Deleted",
      description: `"${template.name}" template has been removed.`
    });
  };

  const duplicateTemplate = (id: string) => {
    const template = templates.find(t => t.id === id);
    if (!template) return;

    const duplicatedTemplate: ListingTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      isCustom: true
    };

    setTemplates(prev => [...prev, duplicatedTemplate]);
    
    toast({
      title: "Template Duplicated",
      description: `Created a copy of "${template.name}".`
    });

    return duplicatedTemplate;
  };

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate
  };
};
