import { useState, useCallback } from 'react';

interface UseModalManagerOptions<T = any> {
  initialOpen?: boolean;
  onOpen?: (data?: T) => void;
  onClose?: (data?: T) => void;
  resetDataOnClose?: boolean;
}

export const useModalManager = <T = any>(options: UseModalManagerOptions<T> = {}) => {
  const {
    initialOpen = false,
    onOpen,
    onClose,
    resetDataOnClose = true
  } = options;

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [modalData, setModalData] = useState<T | null>(null);

  const openModal = useCallback((data?: T) => {
    if (data !== undefined) {
      setModalData(data);
    }
    setIsOpen(true);
    onOpen?.(data);
  }, [onOpen]);

  const closeModal = useCallback((returnData?: T) => {
    setIsOpen(false);
    if (resetDataOnClose) {
      setModalData(null);
    }
    onClose?.(returnData);
  }, [onClose, resetDataOnClose]);

  const toggleModal = useCallback((data?: T) => {
    if (isOpen) {
      closeModal();
    } else {
      openModal(data);
    }
  }, [isOpen, openModal, closeModal]);

  const updateModalData = useCallback((data: T) => {
    setModalData(data);
  }, []);

  return {
    isOpen,
    modalData,
    openModal,
    closeModal,
    toggleModal,
    updateModalData
  };
};

// Specialized hook for confirmation dialogs
export const useConfirmationDialog = (
  onConfirm: () => void | Promise<void>,
  options: {
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
  } = {}
) => {
  const modal = useModalManager<typeof options>();

  const showConfirmation = useCallback((customOptions?: Partial<typeof options>) => {
    modal.openModal({ ...options, ...customOptions });
  }, [modal, options]);

  const handleConfirm = useCallback(async () => {
    await onConfirm();
    modal.closeModal();
  }, [onConfirm, modal]);

  const handleCancel = useCallback(() => {
    modal.closeModal();
  }, [modal]);

  return {
    ...modal,
    showConfirmation,
    handleConfirm,
    handleCancel
  };
};

// Specialized hook for edit dialogs
export const useEditDialog = <T>(
  onSave: (data: T) => void | Promise<void>,
  initialData?: T
) => {
  const modal = useModalManager<T>();

  const openEditDialog = useCallback((data: T) => {
    modal.openModal(data);
  }, [modal]);

  const handleSave = useCallback(async (data: T) => {
    await onSave(data);
    modal.closeModal();
  }, [onSave, modal]);

  const handleCancel = useCallback(() => {
    modal.closeModal();
  }, [modal]);

  return {
    ...modal,
    openEditDialog,
    handleSave,
    handleCancel,
    editData: modal.modalData || initialData
  };
};
