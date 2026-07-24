import { useState, useCallback } from 'react';
import { useAuth } from '../store/AuthContext';

export function useSSE() {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuth();

  const stream = useCallback(async (url: string, body: any) => {
    setContent('');
    setError('');
    setIsStreaming(true);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('Failed to start stream');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) {
                  setError(data.error);
                  done = true;
                } else if (data.done) {
                  done = true;
                } else if (data.content) {
                  setContent(prev => prev + data.content);
                }
              } catch (e) {
                // Ignore parse errors on incomplete chunks
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Streaming failed');
    } finally {
      setIsStreaming(false);
    }
  }, [token]);

  return { content, isStreaming, error, stream, setContent };
}
