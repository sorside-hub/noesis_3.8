import { useState, useCallback } from 'react';
import { getAllLocalKeyOverrides } from '../../../lib/ai/keyManager';

export type EditorActionType = 'grammar' | 'summarize' | 'tone' | 'translate' | 'expand' | 'custom' | 'ask';

interface UseAiActionsReturn {
  isLoading: boolean;
  error: string | null;
  executeAction: (action: EditorActionType, text: string, extraContext?: string) => Promise<string | null>;
}

export const useAiActions = (): UseAiActionsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeAction = useCallback(async (
    action: EditorActionType,
    text: string,
    extraContext?: string
  ): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const customKeys = getAllLocalKeyOverrides();
      
      const response = await fetch('/api/editor-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, text, extraContext, customKeys }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute AI action');
      }

      return data.text;
    } catch (err: any) {
      console.error(`[useAiActions] Error executing ${action}:`, err);
      setError(err.message || 'An unexpected error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    executeAction,
  };
};
