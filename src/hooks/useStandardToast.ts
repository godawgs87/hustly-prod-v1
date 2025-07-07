import { useToast } from '@/hooks/use-toast';

/**
 * Standardized toast messages for common scenarios
 * Reduces code duplication and ensures consistent messaging
 */
export const useStandardToast = () => {
  const { toast } = useToast();

  return {
    // Success messages
    success: (title: string, description?: string) => {
      toast({
        title,
        description,
      });
    },

    // Error messages
    error: (title: string, description?: string) => {
      toast({
        title,
        description,
        variant: "destructive",
      });
    },

    // Warning messages  
    warning: (title: string, description?: string) => {
      toast({
        title,
        description,
        variant: "destructive",
      });
    },

    // Common predefined messages
    saveSuccess: () => {
      toast({
        title: "Saved Successfully",
        description: "Your changes have been saved.",
      });
    },

    saveError: () => {
      toast({
        title: "Save Failed",
        description: "There was an error saving your changes. Please try again.",
        variant: "destructive",
      });
    },

    deleteSuccess: () => {
      toast({
        title: "Deleted Successfully",
        description: "The item has been removed.",
      });
    },

    deleteError: () => {
      toast({
        title: "Delete Failed",
        description: "There was an error deleting the item. Please try again.",
        variant: "destructive",
      });
    },

    connectionSuccess: (platform: string) => {
      toast({
        title: `${platform} Connected`,
        description: `Your ${platform} account is now connected and ready to use.`,
      });
    },

    connectionError: (platform: string) => {
      toast({
        title: `${platform} Connection Failed`,
        description: `Failed to connect your ${platform} account. Please check your credentials and try again.`,
        variant: "destructive",
      });
    },

    comingSoon: (feature: string) => {
      toast({
        title: "Coming Soon",
        description: `${feature} will be available soon.`,
      });
    },

    invalidData: (field?: string) => {
      toast({
        title: "Invalid Data",
        description: field ? `Please check the ${field} field.` : "Please check your input and try again.",
        variant: "destructive",
      });
    },

    networkError: () => {
      toast({
        title: "Network Error",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
    },

    permissionError: () => {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to perform this action.",
        variant: "destructive",
      });
    },

    // Raw toast for custom messages
    raw: toast,
  };
};