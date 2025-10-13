import { useRef, useCallback, useState } from 'react';

interface MediaManagerState {
  stream: MediaStream | null;
  isInitialized: boolean;
  error: string | null;
}

interface UseMediaManagerReturn {
  getMediaStream: () => Promise<MediaStream>;
  releaseMediaStream: () => void;
  isInitialized: boolean;
  error: string | null;
}

// Глобальное состояние для медиа-потока
const globalMediaState: MediaManagerState = {
  stream: null,
  isInitialized: false,
  error: null
};

let mediaPromise: Promise<MediaStream> | null = null;

export function useMediaManager(): UseMediaManagerReturn {
  const [, forceUpdate] = useState(0);

  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    // Если поток уже существует, возвращаем его
    if (globalMediaState.stream && globalMediaState.stream.active) {
      return globalMediaState.stream;
    }

    // Если запрос уже в процессе, ждем его завершения
    if (mediaPromise) {
      return mediaPromise;
    }

    // Создаем новый запрос
    mediaPromise = requestMediaAccess();

    try {
      const stream = await mediaPromise;
      globalMediaState.stream = stream;
      globalMediaState.isInitialized = true;
      globalMediaState.error = null;

      // Обновляем все компоненты, использующие этот хук
      forceUpdate(prev => prev + 1);

      return stream;
    } catch (error) {
      globalMediaState.error = error instanceof Error ? error.message : 'Не удалось получить доступ к микрофону';
      globalMediaState.isInitialized = false;

      // Обновляем все компоненты, использующие этот хук
      forceUpdate(prev => prev + 1);

      throw error;
    } finally {
      mediaPromise = null;
    }
  }, []);

  const releaseMediaStream = useCallback(() => {
    if (globalMediaState.stream) {
      globalMediaState.stream.getTracks().forEach(track => track.stop());
      globalMediaState.stream = null;
      globalMediaState.isInitialized = false;
      globalMediaState.error = null;

      // Обновляем все компоненты, использующие этот хук
      forceUpdate(prev => prev + 1);
    }
  }, []);

  return {
    getMediaStream,
    releaseMediaStream,
    isInitialized: globalMediaState.isInitialized,
    error: globalMediaState.error
  };
}

async function requestMediaAccess(): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('getUserMedia не поддерживается в этом браузере');
  }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,      // Включаем для лучшего качества
      noiseSuppression: true,      // Включаем для чистого звука
      autoGainControl: true,       // Включаем для стабильной громкости
      sampleRate: 48000,           // Высокое качество
      channelCount: 1              // Моно для экономии ресурсов
    }
  });
}
