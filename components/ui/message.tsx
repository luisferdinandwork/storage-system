'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MessageType = 'success' | 'error' | 'warning' | 'info';

export interface Message {
  id: string;
  type: MessageType;
  title?: string;
  text: string;
  duration?: number; // in milliseconds, auto-dismiss after this time
}

interface MessageProps {
  message: Message;
  onDismiss: (id: string) => void;
}

export function MessageItem({ message, onDismiss }: MessageProps) {
  useEffect(() => {
    if (message.duration !== 0) {
      const timer = setTimeout(() => {
        onDismiss(message.id);
      }, message.duration || 5000); // Default 5 seconds

      return () => clearTimeout(timer);
    }
  }, [message.id, message.duration, onDismiss]);

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getBackgroundClass = () => {
    switch (message.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div
      className={cn(
        'relative p-4 rounded-md border flex items-start space-x-3 shadow-sm',
        getBackgroundClass()
      )}
    >
      {getIcon()}
      <div className="flex-1">
        {message.title && (
          <h4 className="text-sm font-medium text-gray-900">{message.title}</h4>
        )}
        <p className="text-sm text-gray-700 mt-1">{message.text}</p>
      </div>
      <button
        onClick={() => onDismiss(message.id)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface MessageContainerProps {
  messages: Message[];
  onDismiss: (id: string) => void;
}

export function MessageContainer({ messages, onDismiss }: MessageContainerProps) {
  if (messages.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} onDismiss={onDismiss} />
      ))}
    </div>
  );
}