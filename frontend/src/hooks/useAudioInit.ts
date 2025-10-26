import { useEffect, useState, useCallback } from 'react';

interface UseAudioInitReturn {
  isAudioReady: boolean;
  initAudio: () => Promise<void>;
}

export function useAudioInit(): UseAudioInitReturn {
  const [isAudioReady, setIsAudioReady] = useState(false);

  const initAudio = useCallback(async () => {
    if (isAudioReady) return;

    try {
      // Инициализируем Web Audio API
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();

      // Резюмируем контекст (критично для первого запуска)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Создаём беззвучный сигнал для активации аудио системы
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0; // Беззвучно

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.001);

      // Дополнительно пробуем HTML5 Audio
      const testAudio = new Audio();
      testAudio.src = 'data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAA=';
      testAudio.volume = 0;
      await testAudio.play().catch(() => {});
      testAudio.pause();

      setIsAudioReady(true);

      // Закрываем тестовый контекст
      await audioContext.close();
    } catch (error) {
      // Игнорируем ошибки инициализации
    }
  }, [isAudioReady]);

  // Автоматически инициализируем при первом взаимодействии
  useEffect(() => {
    const events = ['click', 'touchstart', 'keydown'];

    const handler = () => {
      initAudio();
    };

    events.forEach(event => {
      document.addEventListener(event, handler, { once: true, passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handler);
      });
    };
  }, [initAudio]);

  return {
    isAudioReady,
    initAudio
  };
}
