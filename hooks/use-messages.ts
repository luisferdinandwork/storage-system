'use client';

import { useState, useCallback } from 'react';
import { Message, MessageType } from '@/components/ui/message';

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = useCallback((type: MessageType, text: string, title?: string, duration?: number) => {
    const id = Date.now().toString();
    const newMessage: Message = {
      id,
      type,
      title,
      text,
      duration,
    };
    
    setMessages((prev) => [...prev, newMessage]);
    return id;
  }, []);

  const dismissMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const clearAllMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    addMessage,
    dismissMessage,
    clearAllMessages,
  };
}