/**
 * Глобальная утилита для принудительной установки speaker mode
 * Должна вызываться как можно раньше при загрузке приложения
 */

let speakerForced = false;
let forcingInProgress = false;

/**
 * Принудительно устанавливает speaker mode для всех аудио элементов
 */
export async function forceSpeakerMode(): Promise<void> {
  if (forcingInProgress) {
    return;
  }

  forcingInProgress = true;

  try {
    // 1. Создаем временный аудио элемент для инициализации speaker mode
    const tempAudio = document.createElement('audio');
    tempAudio.autoplay = false;
    tempAudio.volume = 0;
    tempAudio.muted = true;
    tempAudio.setAttribute('playsinline', 'true');
    tempAudio.setAttribute('webkit-playsinline', 'true');
    tempAudio.setAttribute('data-proximity-blocked', 'true');
    tempAudio.style.display = 'none';
    document.body.appendChild(tempAudio);

    // 2. Устанавливаем настройки speaker ДО получения потока
    const audioWithSink = tempAudio as HTMLAudioElement & {
      setSinkId?: (deviceId: string) => Promise<void>;
    };

    if (audioWithSink.setSinkId) {
      // Функция для установки speaker с множественными попытками
      const setSpeakerWithRetry = async (maxRetries = 5) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            // Задержка между попытками (увеличивается с каждой попыткой)
            if (attempt > 0) {
              await new Promise(resolve => setTimeout(resolve, 200 * attempt));
            }

            // Получаем список устройств
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

            // Если устройств нет, пробуем еще раз
            if (audioOutputs.length === 0 && attempt < maxRetries - 1) {
              continue;
            }

            // КРИТИЧНО: Пропускаем первое устройство (почти всегда earpiece)
            // Используем второе устройство или последнее
            let speakerDevice = null;

            if (audioOutputs.length > 1) {
              // Приоритет 1: Второе устройство (обычно speaker)
              speakerDevice = audioOutputs[1];
            } else if (audioOutputs.length > 2) {
              // Приоритет 2: Последнее устройство
              speakerDevice = audioOutputs[audioOutputs.length - 1];
            } else {
              // Приоритет 3: Если только одно устройство, используем пустую строку (default)
              await audioWithSink.setSinkId('');
              speakerForced = true;
              return;
            }

            if (speakerDevice) {
              await audioWithSink.setSinkId(speakerDevice.deviceId);
              speakerForced = true;
              
              // Проверяем, что установка прошла успешно
              const currentSinkId = (tempAudio as any).sinkId || '';
              if (currentSinkId === speakerDevice.deviceId) {
                console.log('[SpeakerForcer] Speaker mode установлен:', speakerDevice.label);
                return;
              }
            }
          } catch (error) {
            // Если это последняя попытка, пробуем установить пустую строку
            if (attempt === maxRetries - 1) {
              try {
                await audioWithSink.setSinkId('');
                speakerForced = true;
              } catch (e) {
                console.error('[SpeakerForcer] Не удалось установить speaker mode:', e);
              }
            }
          }
        }
      };

      await setSpeakerWithRetry();
    }

    // 3. Создаем AudioContext для блокировки переключения
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      try {
        const audioContext = new AudioContextClass();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        // Создаем постоянный неслышимый поток для блокировки переключения
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.00001; // Почти неслышимый
        oscillator.frequency.value = 20000; // Ультразвук

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();

        // Сохраняем контекст для последующего использования
        (window as any).__speakerAudioContext = audioContext;
      } catch (error) {
        console.error('[SpeakerForcer] Ошибка создания AudioContext:', error);
      }
    }

    // Удаляем временный элемент (если он все еще в DOM)
    if (tempAudio.parentNode) {
      document.body.removeChild(tempAudio);
    }

    // 4. Применяем к существующим аудио элементам
    applySpeakerToAllAudioElements();

    console.log('[SpeakerForcer] Speaker mode инициализирован');
  } catch (error) {
    console.error('[SpeakerForcer] Ошибка инициализации speaker mode:', error);
  } finally {
    forcingInProgress = false;
  }
}

/**
 * Применяет speaker mode ко всем существующим аудио элементам
 */
export function applySpeakerToAllAudioElements(): void {
  const audioElements = document.querySelectorAll('audio');
  audioElements.forEach((audio) => {
    const audioWithSink = audio as HTMLAudioElement & {
      setSinkId?: (deviceId: string) => Promise<void>;
    };

    if (audioWithSink.setSinkId) {
      // Получаем устройства и выбираем speaker
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        
        if (audioOutputs.length > 1) {
          audioWithSink.setSinkId(audioOutputs[1].deviceId).catch(() => {
            audioWithSink.setSinkId('').catch(() => {});
          });
        } else {
          audioWithSink.setSinkId('').catch(() => {});
        }
      }).catch(() => {
        // Если не удается получить устройства, пробуем установить пустую строку
        if (audioWithSink.setSinkId) {
          audioWithSink.setSinkId('').catch(() => {});
        }
      });
    }
  });
}

/**
 * Принудительно переустанавливает speaker mode (для использования после получения потока)
 */
export async function reforceSpeakerMode(audioElement: HTMLAudioElement): Promise<void> {
  const audioWithSink = audioElement as HTMLAudioElement & {
    setSinkId?: (deviceId: string) => Promise<void>;
  };

  if (!audioWithSink.setSinkId) {
    return;
  }

  try {
    // Даем небольшую задержку для инициализации потока
    await new Promise(resolve => setTimeout(resolve, 100));

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

    if (audioOutputs.length > 1) {
      // Используем второе устройство
      await audioWithSink.setSinkId(audioOutputs[1].deviceId);
    } else {
      await audioWithSink.setSinkId('');
    }
  } catch (error) {
    // Пробуем установить пустую строку
    try {
      await audioWithSink.setSinkId('');
    } catch (e) {
      // Игнорируем ошибки
    }
  }
}

