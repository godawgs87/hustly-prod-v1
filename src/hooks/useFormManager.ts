import { useState, useCallback } from 'react';
import { useAsyncOperation } from './useAsyncOperation';

interface UseFormManagerOptions<T> {
  initialData: T;
  saveFunction: (data: T) => Promise<any>;
  validateFunction?: (data: T) => string[] | null;
  successMessage?: string;
  errorMessage?: string;
  resetOnSave?: boolean;
  showToasts?: boolean;
}

interface ValidationError {
  field?: string;
  message: string;
}

export const useFormManager = <T extends Record<string, any>>(
  options: UseFormManagerOptions<T>
) => {
  const {
    initialData,
    saveFunction,
    validateFunction,
    successMessage = 'Saved successfully',
    errorMessage = 'Failed to save',
    resetOnSave = false,
    showToasts = true
  } = options;

  const [formData, setFormData] = useState<T>(initialData);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const { loading: saving, execute } = useAsyncOperation({
    successMessage,
    errorMessage,
    showSuccessToast: showToasts,
    showErrorToast: showToasts
  });

  const updateField = useCallback(<K extends keyof T>(
    field: K,
    value: T[K]
  ) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      setIsDirty(JSON.stringify(newData) !== JSON.stringify(initialData));
      return newData;
    });
    
    // Clear validation error for this field
    setValidationErrors(prev => prev.filter(error => error.field !== field));
  }, [initialData]);

  const updateMultipleFields = useCallback((updates: Partial<T>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      setIsDirty(JSON.stringify(newData) !== JSON.stringify(initialData));
      return newData;
    });
    
    // Clear validation errors for updated fields
    const updatedFields = Object.keys(updates);
    setValidationErrors(prev => 
      prev.filter(error => !updatedFields.includes(error.field || ''))
    );
  }, [initialData]);

  const validate = useCallback(() => {
    if (!validateFunction) return true;
    
    const errors = validateFunction(formData);
    if (errors && errors.length > 0) {
      setValidationErrors(errors.map(error => ({ message: error })));
      return false;
    }
    
    setValidationErrors([]);
    return true;
  }, [formData, validateFunction]);

  const save = useCallback(async () => {
    // Validate before saving
    if (!validate()) {
      return false;
    }

    const result = await execute(() => saveFunction(formData));
    
    if (result !== null) {
      setIsDirty(false);
      if (resetOnSave) {
        setFormData(initialData);
      }
      return true;
    }
    
    return false;
  }, [execute, saveFunction, formData, validate, resetOnSave, initialData]);

  const reset = useCallback(() => {
    setFormData(initialData);
    setValidationErrors([]);
    setIsDirty(false);
  }, [initialData]);

  const resetField = useCallback(<K extends keyof T>(field: K) => {
    updateField(field, initialData[field]);
  }, [initialData, updateField]);

  const getFieldError = useCallback((field: keyof T) => {
    return validationErrors.find(error => error.field === field)?.message;
  }, [validationErrors]);

  const hasErrors = validationErrors.length > 0;
  const canSave = isDirty && !hasErrors && !saving;

  return {
    // Data
    formData,
    validationErrors,
    isDirty,
    saving,
    hasErrors,
    canSave,
    
    // Actions
    updateField,
    updateMultipleFields,
    save,
    reset,
    resetField,
    validate,
    getFieldError
  };
};

// Specialized hook for simple key-value forms
export const useSimpleForm = <T extends Record<string, any>>(
  initialData: T,
  saveFunction: (data: T) => Promise<any>,
  options: Omit<UseFormManagerOptions<T>, 'initialData' | 'saveFunction'> = {}
) => {
  return useFormManager({
    initialData,
    saveFunction,
    ...options
  });
};
