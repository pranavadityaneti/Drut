import React, { useState, createContext, useContext, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './Card';
import { Button } from './Button';

interface ModalContent {
  title: string;
  body: ReactNode;
  actions?: ReactNode;
}

interface ModalContextType {
  openModal: (content: ModalContent) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalContent, setModalContent] = useState<ModalContent | null>(null);

  const openModal = (content: ModalContent) => {
    setModalContent(content);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setModalContent(null);
  };
  
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      {isOpen && modalContent && (
         <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-0"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
            onClick={handleBackdropClick}
          >
            <Card className="relative z-10 w-full max-w-lg m-4 animate-in zoom-in-95">
              <CardHeader>
                <CardTitle id="modal-title">{modalContent.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {modalContent.body}
              </CardContent>
              <CardFooter>
                {modalContent.actions ? modalContent.actions : (
                  <Button onClick={closeModal} className="w-full">
                    Close
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
      )}
    </ModalContext.Provider>
  );
};
