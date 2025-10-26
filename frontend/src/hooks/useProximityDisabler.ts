import { useCallback } from 'react';

interface ProximityDisablerOptions {
  enabled: boolean;
}

interface UseProximityDisablerReturn {
  enforceMainSpeaker: (permissionGranted?: boolean) => Promise<void>;
  preventProximitySwitching: () => (() => void) | undefined;
  applySpeakerStyles: () => (() => void) | undefined;
  initializeProximityDisabler: (permissionGranted?: boolean) => Promise<(() => void) | undefined>;
}

/**
 * Хук для отключения датчика приближения в мобильных браузерах
 * Предотвращает переключение звука на верхний динамик при поднесении к уху
 */
export function useProximityDisabler(options: ProximityDisablerOptions = { enabled: true }): UseProximityDisablerReturn {
  const { enabled } = options;

  // Функция для принудительного использования громкого динамика
  // Принимает флаг permissionGranted - если true, создаёт отдельный поток (без запроса)
  const enforceMainSpeaker = useCallback(async (permissionGranted: boolean = false) => {
    if (!enabled) return;

    try {
      // 1. Устанавливаем громкость на максимум для основного динамика
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.volume = 1;
        // Устанавливаем атрибуты для предотвращения оптимизаций браузера
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
        audio.setAttribute('preload', 'metadata');
        audio.muted = false;

        // КРИТИЧНО: Принудительно блокируем любые попытки переключения на earpiece
        const audioWithSink = audio as HTMLAudioElement & { setSinkId?: (deviceId: string) => Promise<void> };
        if (audioWithSink.setSinkId && typeof audioWithSink.setSinkId === 'function') {
          try {
            // Принудительно устанавливаем на громкий динамик
            audioWithSink.setSinkId('default').catch(() => {
              // Если не удается установить default, пробуем пустую строку
              audioWithSink.setSinkId('').catch(() => {});
            });
          } catch (e) {
            // Игнорируем ошибки setSinkId
          }
        }
      });

      // 2. Создаем постоянный аудио контекст для "захвата" аудио вывода
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }
      const audioContext = new AudioContextClass();

      // КРИТИЧНО: Резюмируем контекст (для первого запуска TMA)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Создаем постоянный бесшумный поток для блокировки переключения
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Устанавливаем минимальную, но ненулевую громкость
      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Воспроизводим постоянный неслышимый звук для блокировки переключения
      oscillator.frequency.setValueAtTime(20000, audioContext.currentTime); // Ультразвук
      oscillator.start();

      // НЕ останавливаем oscillator - он должен работать постоянно!

      // УДАЛЕНО: Больше не создаём дополнительные медиа потоки
      // Используется только основной поток от useMediaManager

    } catch (error) {
    }
  }, [enabled]);

  // Функция для предотвращения переключения на верхний динамик
  const preventProximitySwitching = useCallback(() => {
    if (!enabled) return;

    try {
      // Отключаем автоматическое управление аудио выводом
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('seekto', null);
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
      }

      // Предотвращаем обработку событий датчика приближения
      const preventProximityEvents = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        return false;
      };

      // Блокируем ВСЕ возможные события датчика приближения и переключения аудио
      const eventsToBlock = [
        'deviceproximity',
        'userproximity',
        'deviceorientation',
        'orientationchange',
        'devicemotion',
        'webkitdeviceproximity',
        'mozdeviceproximity',
        'devicelight',
        'webkitdeviceorientation',
        'mozdeviceorientation',
        // События для блокировки автоматического переключения аудио
        'webkitbeginfullscreen',
        'webkitendfullscreen',
        'webkitpresentationmodechanged',
        'enterpictureinpicture',
        'leavepictureinpicture',
        // События фокуса для предотвращения переключения при приближении к уху
        'focus',
        'blur',
        'visibilitychange',
        'pagehide',
        'pageshow'
      ];

      eventsToBlock.forEach(eventType => {
        document.addEventListener(eventType, preventProximityEvents, {
          passive: false,
          capture: true
        });
        window.addEventListener(eventType, preventProximityEvents, {
          passive: false,
          capture: true
        });
      });


      // Возвращаем функцию очистки
      return () => {
        eventsToBlock.forEach(eventType => {
          document.removeEventListener(eventType, preventProximityEvents, true);
          window.removeEventListener(eventType, preventProximityEvents, true);
        });
      };
    } catch (error) {
    }
  }, [enabled]);

  // Функция для настройки CSS стилей
  const applySpeakerStyles = useCallback(() => {
    if (!enabled) return;

    const styleId = 'proximity-disabler-styles';

    // Удаляем существующие стили если есть
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Создаем новые стили
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* АГРЕССИВНОЕ принудительное использование основного динамика */
      audio, video {
        -webkit-playsinline: true !important;
        playsinline: true !important;
        volume: 1 !important;
        muted: false !important;
        preload: metadata !important;
        -webkit-audio-session: playback !important;
        audio-session: playback !important;
        -webkit-audio-category: playback !important;
        audio-category: playback !important;
      }

      /* Принудительная блокировка earpiece режима */
      audio[controls] {
        -webkit-audio-session: playback !important;
        -webkit-media-controls-play-button: block !important;
        -webkit-media-controls-panel: block !important;
      }

      /* Предотвращение оптимизаций браузера для аудио */
      body, html {
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        -webkit-tap-highlight-color: transparent !important;
        -webkit-overflow-scrolling: touch !important;
        touch-action: manipulation !important;
      }

      /* КРИТИЧНО: Блокировка всех возможных режимов earpiece */
      * {
        -webkit-audio-session: playback !important;
        audio-session: playback !important;
        -webkit-audio-category: playback !important;
        audio-category: playback !important;
        -webkit-audio-mix-with-others: true !important;
        audio-mix-with-others: true !important;
      }

      /* Дополнительная блокировка для WebKit */
      :root {
        -webkit-audio-session: playback !important;
        -webkit-force-hardware-acceleration: true !important;
      }

      /* Предотвращение автоматического pause при proximity */
      audio:not([data-proximity-blocked]) {
        -webkit-audio-session: playback !important;
      }

      /* Принудительная установка режима speaker для всех медиа элементов */
      audio, video, source {
        -webkit-audio-session: playback !important;
        -webkit-audio-category: playback !important;
        -webkit-media-session: playback !important;
      }
    `;

    document.head.appendChild(style);

    // Возвращаем функцию очистки
    return () => {
      const styleElement = document.getElementById(styleId);
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [enabled]);

  // Основная функция инициализации
  // Принимает флаг permissionGranted - если true, создаёт отдельные потоки (без запроса)
  const initializeProximityDisabler = useCallback(async (permissionGranted: boolean = false) => {
    if (!enabled) return;

    // Применяем все методы
    const cleanupStyles = applySpeakerStyles();
    const cleanupEvents = preventProximitySwitching();
    await enforceMainSpeaker(permissionGranted);

    // Возвращаем функцию очистки
    return () => {
      cleanupStyles?.();
      cleanupEvents?.();
    };
  }, [enabled, applySpeakerStyles, preventProximitySwitching, enforceMainSpeaker]);

  // Убираем автоматическую инициализацию при монтировании
  // Инициализация теперь происходит только при вызове connect() в useVoiceAI

  return {
    enforceMainSpeaker,
    preventProximitySwitching,
    applySpeakerStyles,
    initializeProximityDisabler
  };
}
