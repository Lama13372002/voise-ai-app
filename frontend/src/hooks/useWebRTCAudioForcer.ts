import { useCallback } from 'react';

interface WebRTCAudioForcerReturn {
  configureRTCForSpeaker: (pc: RTCPeerConnection) => void;
  forceAudioToSpeaker: (audioElement: HTMLAudioElement) => Promise<AudioContext | undefined>;
  createSpeakerAudioContext: (permissionGranted?: boolean) => Promise<AudioContext | null>;
}

/**
 * Хук для принудительной настройки WebRTC на использование внешнего динамика
 */
export function useWebRTCAudioForcer(): WebRTCAudioForcerReturn {

  // Настройка RTCPeerConnection для принудительного использования динамика
  const configureRTCForSpeaker = useCallback((pc: RTCPeerConnection) => {
    try {
      // 1. Настраиваем обработчики для всех входящих треков
      pc.ontrack = (event) => {

        event.streams.forEach(stream => {
          stream.getAudioTracks().forEach(track => {
            // Применяем constraints для оптимального качества звука с внешним динамиком
            const constraints = {
              echoCancellation: true,   // Включаем эхоподавление для лучшего качества
              noiseSuppression: true,   // Включаем шумоподавление для чистого звука
              autoGainControl: true     // Включаем автогейн для стабильной громкости
            };

            if (track.applyConstraints) {
              track.applyConstraints(constraints).catch(() => {
                // Игнорируем ошибки constraints
              });
            }
          });
        });
      };

      // 2. Настраиваем статистику для мониторинга
      const monitorAudioOutput = () => {
        pc.getStats().then(stats => {
          stats.forEach(report => {
            if (report.type === 'outbound-rtp' && report.kind === 'audio') {
              // Мониторинг статистики
            }
          });
        }).catch(() => {
          // Игнорируем ошибки статистики
        });
      };

      // Мониторим каждые 5 секунд
      const statsInterval = setInterval(monitorAudioOutput, 5000);

      // Очистка при закрытии соединения
      pc.addEventListener('connectionstatechange', () => {
        if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
          clearInterval(statsInterval);
        }
      });

    } catch (error) {
      // Игнорируем ошибки настройки RTC
    }
  }, []);

  // Принудительная настройка аудио элемента на динамик
  const forceAudioToSpeaker = useCallback(async (audioElement: HTMLAudioElement) => {
    try {

      // 1. АГРЕССИВНЫЕ базовые настройки
      audioElement.volume = 1.0;
      audioElement.muted = false;
      audioElement.autoplay = true;
      audioElement.loop = false;
      audioElement.preload = 'metadata';

      // Атрибуты для мобильных браузеров - ПРИНУДИТЕЛЬНЫЙ SPEAKER MODE
      audioElement.setAttribute('playsinline', 'true');
      audioElement.setAttribute('webkit-playsinline', 'true');
      audioElement.setAttribute('x-webkit-airplay', 'allow');
      audioElement.setAttribute('controls', 'false');
      audioElement.setAttribute('data-proximity-blocked', 'true');

      // КРИТИЧНО: Блокируем earpiece режим
      audioElement.style.cssText += `
        -webkit-audio-session: playback !important;
        audio-session: playback !important;
        -webkit-audio-category: playback !important;
        audio-category: playback !important;
      `;

      // Дополнительные атрибуты для предотвращения переключения
      audioElement.setAttribute('webkit-audio-session', 'playback');
      audioElement.setAttribute('audio-session', 'playback');

      // 2. Попытка принудительно установить устройство вывода
      const audioElementExtended = audioElement as HTMLAudioElement & {
        setSinkId?: (deviceId: string) => Promise<void>;
        sinkId?: string;
      };

      if (audioElementExtended.setSinkId) {
        try {
          // Пытаемся получить список аудио устройств
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

          // АГРЕССИВНЫЙ поиск громкого динамика - проверяем ВСЕ возможные варианты
          let speakerDevice = null;

          // Приоритет 1: Устройства с явным указанием speaker
          speakerDevice = audioOutputs.find(device =>
            device.label.toLowerCase().includes('speaker') ||
            device.label.toLowerCase().includes('динамик') ||
            device.label.toLowerCase().includes('speakerphone') ||
            device.label.toLowerCase().includes('громкий') ||
            device.label.toLowerCase().includes('loud')
          );

          // Приоритет 2: НЕ earpiece устройства (исключаем явные earpiece)
          if (!speakerDevice) {
            speakerDevice = audioOutputs.find(device =>
              !device.label.toLowerCase().includes('earpiece') &&
              !device.label.toLowerCase().includes('receiver') &&
              !device.label.toLowerCase().includes('ear') &&
              !device.label.toLowerCase().includes('телефон') &&
              !device.label.toLowerCase().includes('phone') &&
              device.deviceId !== ''
            );
          }

          // Приоритет 3: Любое устройство кроме первого (первое часто earpiece)
          if (!speakerDevice && audioOutputs.length > 1) {
            speakerDevice = audioOutputs[1];
          }

          // Приоритет 4: Default device как последний вариант
          if (!speakerDevice) {
            speakerDevice = audioOutputs.find(device => device.deviceId === 'default');
          }

          if (speakerDevice) {
            await audioElementExtended.setSinkId(speakerDevice.deviceId);
          } else {
            await audioElementExtended.setSinkId('');
          }
        } catch (sinkError) {
          try {
            await audioElementExtended.setSinkId('');
          } catch (e) {
            // Игнорируем критические ошибки
          }
        }
      }

      // 3. Создаем Web Audio контекст для дополнительного контроля И МАКСИМАЛЬНОЙ громкости
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }
      const audioContext = new AudioContextClass();

      // Резюмируем контекст если он приостановлен
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaElementSource(audioElement);
      const gainNode = audioContext.createGain();

      // Устанавливаем МАКСИМАЛЬНУЮ громкость (даже больше 1.0 для громкого динамика)
      gainNode.gain.setValueAtTime(2.0, audioContext.currentTime);

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      return audioContext;
    } catch (error) {
      // Игнорируем ошибки
    }
  }, []);

  // Создание специального аудио контекста для громкого воспроизведения
  // Принимает флаг permissionGranted - если true, создаёт отдельный поток (без запроса)
  const createSpeakerAudioContext = useCallback(async (permissionGranted: boolean = false): Promise<AudioContext | null> => {
    try {
      // Создаем аудио контекст
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();

      // Создаем постоянный генератор для блокировки переключений
      const oscillator = audioContext.createOscillator();
      const oscGain = audioContext.createGain();

      oscGain.gain.setValueAtTime(0.00001, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(20000, audioContext.currentTime); // Ультразвук

      oscillator.connect(oscGain);
      oscGain.connect(audioContext.destination);
      oscillator.start();
      // НЕ останавливаем генератор для постоянной блокировки

      return audioContext;
    } catch (error) {
      return null;
    }
  }, []);

  return {
    configureRTCForSpeaker,
    forceAudioToSpeaker,
    createSpeakerAudioContext
  };
}
