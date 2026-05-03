import { createContext, useContext } from 'react';

export const MessagesContext = createContext(null);

export const useMessages = () => {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used inside MessagesProvider');
  return ctx;
};

