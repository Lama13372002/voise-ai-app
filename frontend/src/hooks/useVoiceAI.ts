import { useState, useRef, useCallback, useEffect } from 'react';
import { useProximityDisabler } from './useProximityDisabler';
import { useWebRTCAudioForcer } from './useWebRTCAudioForcer';
import { useMediaManager } from './useMediaManager';
import { apiClient } from '@/lib/api-client';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'error' | 'reconnecting';

interface UseVoiceAIReturn {
  state: ConnectionState;
  isConnected: boolean;
  connect: (userId?: number, selectedVoice?: string) => Promise<void>;
  disconnect: () => void;
  error: string | null;
  tokenBalance: number | null;
  canConnect: boolean;
  updateTokenBalance: (userId: number) => Promise<void>;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

interface VoiceMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TokenUsage {
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
}

interface TokenCheckResult {
  success: boolean;
  current_balance: number;
  can_proceed: boolean;
  error?: string;
}

export function useVoiceAI(): UseVoiceAIReturn {
  const [state, setState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [canConnect, setCanConnect] = useState<boolean>(false);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const maxReconnectAttempts = 3;

  // Инициализируем хук для отключения датчика приближения
  const { enforceMainSpeaker, initializeProximityDisabler } = useProximityDisabler({
    enabled: true
  });

  // Инициализируем хук для принудительного использования внешнего динамика в WebRTC
  const { configureRTCForSpeaker, forceAudioToSpeaker, createSpeakerAudioContext } = useWebRTCAudioForcer();

  // Инициализируем централизованный медиа-менеджер
  const { getMediaStream, releaseMediaStream } = useMediaManager();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userIdRef = useRef<number | null>(null);
  const sessionIdRef = useRef<number | null>(null);
  const processedItemIds = useRef<Set<string>>(new Set()); // Для дедупликации
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastConnectArgsRef = useRef<{userId?: number, selectedVoice?: string} | null>(null);
  const connectInternalRef = useRef<((userId?: number, selectedVoice?: string) => Promise<void>) | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadCheckIntervalRef = useRef<number | null>(null);

  // Функция для остановки воспроизведения при обнаружении речи пользователя
  const interruptPlayback = useCallback(() => {
    // Прерываем только если ИИ сейчас говорит
    if (state === 'speaking' && audioRef.current && !audioRef.current.paused) {
      console.log('⚡ Прерывание воспроизведения ИИ');

      // Плавно уменьшаем громкость для избежания щелчков
      const fadeOut = () => {
        if (audioRef.current && audioRef.current.volume > 0.1) {
          audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.3);
          requestAnimationFrame(fadeOut);
        } else if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.volume = 1; // Восстанавливаем громкость для следующего ответа
          console.log('🔇 Воспроизведение остановлено');
        }
      };
      fadeOut();

      // Также отправляем команду на сервер для прерывания генерации
      if (dcRef.current && dcRef.current.readyState === 'open') {
        dcRef.current.send(JSON.stringify({
          type: 'response.cancel'
        }));
      }
    }
  }, [state]);

  // Функция для очистки соединения
  const cleanupConnection = useCallback(() => {
    // Останавливаем VAD мониторинг
    if (vadCheckIntervalRef.current) {
      clearInterval(vadCheckIntervalRef.current);
      vadCheckIntervalRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // Игнорируем ошибки
      }
      audioContextRef.current = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {
        // Игнорируем ошибки при закрытии
      }
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      // Очищаем локальную ссылку, медиа-менеджер управляет потоком
      localStreamRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    dcRef.current = null;
    userIdRef.current = null;
    sessionIdRef.current = null;
    processedItemIds.current.clear();
    lastConnectArgsRef.current = null;

    // Очищаем таймер переподключения
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setState('idle');
    setError(null);
    setReconnectAttempts(0);
  }, []);

  // Функция для сохранения сообщения в базу данных
  const saveMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
    if (!userIdRef.current) {
      return;
    }

    try {
      await apiClient.saveMessage({
        user_id: userIdRef.current,
        session_id: sessionIdRef.current?.toString(),
        message_type: role,
        content: content.trim(),
        audio_duration_seconds: 0
      });
    } catch (error) {
      // Игнорируем ошибки сохранения
    }
  }, []);

  // Функция для проверки баланса токенов
  const checkTokenBalance = useCallback(async (userId: number): Promise<TokenCheckResult> => {
    try {
      const result = await apiClient.getTokenBalance(userId);

      if (result.success && result.data) {
        const balance = result.data.token_balance;
        setTokenBalance(balance);
        setCanConnect(balance > 2000);
        return {
          success: true,
          current_balance: balance,
          can_proceed: balance > 2000
        };
      } else {
        setTokenBalance(0);
        setCanConnect(false);
        return {
          success: false,
          current_balance: 0,
          can_proceed: false,
          error: result.error || 'Ошибка проверки баланса'
        };
      }
    } catch (error) {
      setTokenBalance(0);
      setCanConnect(false);
      return {
        success: false,
        current_balance: 0,
        can_proceed: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }, []);

  // Функция для списания оставшихся токенов (≤2000)
  const deductRemainingTokens = useCallback(async (userId: number, balance: number) => {
    if (balance <= 0 || balance > 2000) return;

    try {
      await apiClient.deductTokens({
        user_id: userId,
        session_id: `cleanup_${Date.now()}`,
        usage: {
          total_tokens: balance,
          input_tokens: balance,
          output_tokens: 0
        }
      });
    } catch (error) {
      // Игнорируем ошибки при списании оставшихся токенов
    }
  }, []);

  // Функция для списания токенов через новый PATCH endpoint
  const deductTokens = useCallback(async (usage: TokenUsage, sessionId: string) => {
    if (!userIdRef.current) {
      return;
    }

    try {
      // Проверяем баланс перед списанием
      const tokenCheck = await checkTokenBalance(userIdRef.current);

      if (!tokenCheck.can_proceed) {
        // Баланс меньше 2000, завершаем разговор
        if (tokenCheck.current_balance <= 2000 && tokenCheck.current_balance > 0) {
          await deductRemainingTokens(userIdRef.current, tokenCheck.current_balance);
        }

        setError('Недостаточно токенов для продолжения. Приобретите подписку для дальнейшего использования.');
        cleanupConnection();
        return;
      }

      const result = await apiClient.deductTokens({
        user_id: userIdRef.current,
        session_id: sessionId,
        usage: usage
      });

      if (result.success && result.data) {
        // Проверяем новый баланс после списания
        if (result.data.new_balance <= 2000) {
          // Если баланс стал ≤2000, списываем остаток и завершаем
          if (result.data.new_balance > 0) {
            await deductRemainingTokens(userIdRef.current, result.data.new_balance);
          }

          setError('Токены закончились. Приобретите подписку для продолжения.');
          cleanupConnection();
        }
      } else {
        if (result.error === 'Недостаточно токенов' || result.error === 'Insufficient tokens') {
          setError('Недостаточно токенов для продолжения. Приобретите подписку для дальнейшего использования.');
          cleanupConnection();
        }
      }

    } catch (error) {
      // При ошибке также завершаем соединение
      setError('Ошибка проверки токенов. Попробуйте позже.');
      cleanupConnection();
    }
  }, [checkTokenBalance, deductRemainingTokens, cleanupConnection]);

  // Функция для автоматического переподключения
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      setError('Превышено максимальное количество попыток переподключения. Попробуйте подключиться заново.');
      setState('error');
      return;
    }

    if (!lastConnectArgsRef.current) {
      setError('Не удалось восстановить параметры соединения.');
      setState('error');
      return;
    }

    setState('reconnecting');
    setReconnectAttempts(prev => prev + 1);

    // Экспоненциальное увеличение задержки: 2^attempt * 1000ms
    const delay = Math.pow(2, reconnectAttempts) * 1000;


    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        const { userId, selectedVoice } = lastConnectArgsRef.current!;
        if (connectInternalRef.current) {
          await connectInternalRef.current(userId, selectedVoice);
        }
      } catch (error) {
        // Если это была последняя попытка, показываем ошибку
        if (reconnectAttempts + 1 >= maxReconnectAttempts) {
          setError('Не удалось восстановить соединение. Проверьте подключение к интернету.');
          setState('error');
        } else {
          // Иначе пробуем еще раз
          attemptReconnect();
        }
      }
    }, delay);
  }, [reconnectAttempts, maxReconnectAttempts]);

  // Внутренняя функция подключения (без сохранения аргументов)
  const connectInternal = useCallback(async (userId?: number, selectedVoice?: string) => {
    if (state === 'connecting' || state === 'connected') return;

    // Если это не переподключение, очищаем счетчик попыток
    if (state !== 'reconnecting') {
      setReconnectAttempts(0);
      setState('connecting');
    }

    setError(null);
    userIdRef.current = userId || null;
    const voice = selectedVoice || 'ash';

    try {
      // Проверяем баланс токенов перед подключением
      if (userId) {
        const tokenCheck = await checkTokenBalance(userId);

        if (!tokenCheck.success) {
          throw new Error(tokenCheck.error || 'Ошибка проверки баланса токенов');
        }

        if (!tokenCheck.can_proceed) {
          // Если токенов меньше 2000, списываем остаток и показываем ошибку
          if (tokenCheck.current_balance > 0 && tokenCheck.current_balance <= 2000) {
            await deductRemainingTokens(userId, tokenCheck.current_balance);
          }

          throw new Error('Недостаточно токенов для подключения. Приобретите подписку для использования голосового ИИ.');
        }
      }
      // Получаем токен от нашего API с user_id для контекста
      const tokenData = await apiClient.getOpenAIToken(userId);
      const ephemeralKey = tokenData.client_secret?.value || tokenData.value;

      if (!ephemeralKey) {
        throw new Error('Токен не найден в ответе сервера');
      }

      // ВАЖНО: Получаем доступ к микрофону - ЕДИНСТВЕННЫЙ запрос разрешения!
      localStreamRef.current = await getMediaStream();

      // Инициализируем локальный VAD для быстрого прерывания
      try {
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(localStreamRef.current);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        analyserRef.current.smoothingTimeConstant = 0.3; // Более быстрая реакция
        source.connect(analyserRef.current);

        // Запускаем мониторинг уровня звука
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        let consecutiveActiveFrames = 0;

        vadCheckIntervalRef.current = window.setInterval(() => {
          if (!analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);

          // Вычисляем средний уровень звука
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

          // Порог для обнаружения речи (настраиваемый)
          const SPEECH_THRESHOLD = 15; // Ниже = более чувствительное обнаружение
          const REQUIRED_ACTIVE_FRAMES = 2; // Количество последовательных активных кадров для подтверждения речи

          if (average > SPEECH_THRESHOLD) {
            consecutiveActiveFrames++;

            // Если обнаружили речь в течение нескольких кадров подряд - прерываем воспроизведение
            if (consecutiveActiveFrames >= REQUIRED_ACTIVE_FRAMES) {
              interruptPlayback();
            }
          } else {
            consecutiveActiveFrames = 0;
          }
        }, 50); // Проверяем каждые 50ms для быстрой реакции

      } catch (e) {
        console.warn('Не удалось инициализировать локальный VAD:', e);
        // Продолжаем без локального VAD, будет использоваться только серверный
      }

      // Инициализация блокировки earpiece БЕЗ создания дополнительных потоков
      // Все функции теперь используют ТОЛЬКО основной поток от useMediaManager

      // 1. Принудительно активируем speaker mode (использует только oscillator)
      await enforceMainSpeaker(false);

      // 2. Инициализируем полную блокировку proximity sensor (использует только oscillator)
      await initializeProximityDisabler(false);

      // 3. Создаем аудио контекст для блокировки earpiece (использует только oscillator)
      const speakerContext = await createSpeakerAudioContext(false);

      // 4. Дополнительная защита: принудительно блокируем любые медиа события
      const blockMediaEvents = (e: Event) => {
        // Блокируем события, которые могут вызвать переключение на earpiece
        if (e.type.includes('proximity') ||
            e.type.includes('orientation') ||
            e.type.includes('devicemotion')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }
      };

      // Добавляем глобальную блокировку на все медиа события
      ['deviceproximity', 'userproximity', 'deviceorientation', 'devicemotion'].forEach(eventType => {
        document.addEventListener(eventType, blockMediaEvents, { passive: false, capture: true });
        window.addEventListener(eventType, blockMediaEvents, { passive: false, capture: true });
      });

      // Создаем RTCPeerConnection
      pcRef.current = new RTCPeerConnection();

      // Настраиваем RTCPeerConnection для принудительного использования внешнего динамика
      configureRTCForSpeaker(pcRef.current);

      // АГРЕССИВНЫЙ обработчик для входящего аудио
      pcRef.current.ontrack = async (event) => {

        if (!audioRef.current) {
          audioRef.current = new Audio();
          audioRef.current.autoplay = true;

          // КРИТИЧНО: Блокируем earpiece еще до установки потока
          audioRef.current.setAttribute('data-proximity-blocked', 'true');
          audioRef.current.setAttribute('webkit-audio-session', 'playback');
          audioRef.current.style.cssText += '-webkit-audio-session: playback !important;';
        }

        // Устанавливаем поток
        audioRef.current.srcObject = event.streams[0];

        // АГРЕССИВНАЯ последовательность принудительной настройки

        // 1. Сначала принудительная настройка аудио элемента
        await forceAudioToSpeaker(audioRef.current);

        // 2. Затем принудительная активация speaker mode (без запроса разрешения)
        await enforceMainSpeaker(false);

        // 3. Дополнительная блокировка через прямое вмешательство в DOM
        setTimeout(async () => {
          if (audioRef.current) {
            // Еще раз принудительно настраиваем через 100ms
            await forceAudioToSpeaker(audioRef.current);

            // И через 500ms для надежности
            setTimeout(async () => {
              if (audioRef.current) {
                await forceAudioToSpeaker(audioRef.current);
              }
            }, 500);
          }
        }, 100);
      };

      // Обработчик состояния соединения
      pcRef.current.onconnectionstatechange = () => {
        const connectionState = pcRef.current?.connectionState;

        if (connectionState === 'connected') {
          setState('connected');
          // Сбрасываем счетчик попыток при успешном подключении
          setReconnectAttempts(0);
        } else if (connectionState === 'failed' || connectionState === 'disconnected') {

          // Проверяем, есть ли интернет и можем ли переподключиться
          if (navigator.onLine && lastConnectArgsRef.current && reconnectAttempts < maxReconnectAttempts) {
            // Очищаем текущее соединение перед переподключением
            if (pcRef.current) {
              try {
                pcRef.current.close();
              } catch (e) {
                // Игнорируем ошибки при закрытии
              }
              pcRef.current = null;
            }

            if (localStreamRef.current) {
              localStreamRef.current.getTracks().forEach(track => track.stop());
              localStreamRef.current = null;
            }

            // Пытаемся переподключиться
            attemptReconnect();
          } else {
            setState('error');
            setError(navigator.onLine ? 'Соединение потеряно' : 'Нет подключения к интернету');
          }
        }
      };

      // Обработчик для data channel (получение сообщений от ИИ)
      pcRef.current.ondatachannel = (event) => {
        const channel = event.channel;

        channel.onopen = () => {
          // Data channel готов
        };

        channel.onmessage = (message) => {
          // Обрабатываем входящие сообщения
        };

        channel.onerror = (error) => {
          // Обрабатываем ошибки канала
        };

        channel.onclose = () => {
          // Data channel закрыт
        };
      };

      // Добавляем локальный аудио трек
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        pcRef.current.addTrack(audioTrack, localStreamRef.current);
      }

      // Создаем исходящий data channel
      dcRef.current = pcRef.current.createDataChannel('oai-events');

      dcRef.current.onopen = () => {
        // Настраиваем сессию с выбранным голосом и промтом
        if (dcRef.current && dcRef.current.readyState === 'open') {
          const sessionConfig = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: 'Инструкции будут получены от сервера через API token endpoint',
              voice: voice, // Используем выбранный голос
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'whisper-1'
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.3, // Более чувствительное обнаружение речи
                prefix_padding_ms: 100, // Меньше задержки перед началом записи
                silence_duration_ms: 200 // Быстрее определяем конец речи (200мс тишины)
              },
              tools: [],
              tool_choice: 'auto',
              temperature: 0.8,
              max_response_output_tokens: 4096
            }
          };

          dcRef.current.send(JSON.stringify(sessionConfig));
        }
      };

      dcRef.current.onmessage = async (message) => {
        try {
          const eventData = JSON.parse(message.data);

          // Логируем все события для отладки
          console.log('OpenAI Event:', eventData.type);

          // Обрабатываем только важные события
          if (eventData.type) {

            // События статуса ввода
            if (eventData.type === 'input_audio_buffer.speech_started') {
              console.log('👂 Начало речи пользователя');
              setState('listening');
            }
            else if (eventData.type === 'input_audio_buffer.speech_stopped') {
              console.log('🤐 Конец речи пользователя');
            }
            else if (eventData.type === 'input_audio_buffer.committed') {
              console.log('✅ Аудио буфер зафиксирован');
            }

            // События создания ответа
            else if (eventData.type === 'response.created') {
              console.log('🤔 ИИ начал обработку');
              setState('thinking');
            }
            else if (eventData.type === 'response.audio.delta') {
              console.log('🔊 ИИ отправляет аудио');
              setState('speaking');
            }
            else if (eventData.type === 'response.audio.done') {
              console.log('🔇 ИИ закончил говорить');
              setState('connected');
            }

            // Обработка завершения ответа с данными о токенах
            else if (eventData.type === 'response.done') {
              console.log('✅ Ответ завершен');
              setState('connected');

              if (eventData.response?.usage) {
                const usage = eventData.response.usage;
                const responseId = eventData.response?.id || `session_${Date.now()}`;
                console.log('💰 Токены использовано:', usage.total_tokens);

                // Списываем токены через новый PATCH endpoint
                await deductTokens(usage, responseId);
              }
            }

            // Проверяем разные возможные события для сохранения сообщений
            else if (eventData.type === 'conversation.item.done') {
              if (eventData.item && eventData.item.content && eventData.item.content.length > 0) {
                const item = eventData.item;
                const itemId = item.id || `${item.role}_${Date.now()}`;

                // Проверяем, не обрабатывали ли мы уже это сообщение
                if (processedItemIds.current.has(itemId)) {
                  return;
                }

                // Добавляем ID в список обработанных
                processedItemIds.current.add(itemId);

                // Для пользователя - сохраняем сообщение
                if (item.role === 'user') {
                  if (item.content[0]?.type === 'input_audio') {
                    const userMessage = item.content[0]?.transcript || '[Голосовое сообщение]';
                    console.log('💬 Пользователь:', userMessage);
                    await saveMessage('user', userMessage);
                  }
                }

                // Для ассистента - сохраняем ответ
                else if (item.role === 'assistant') {
                  if (item.content[0]?.type === 'output_audio' && item.content[0]?.transcript) {
                    const transcript = item.content[0].transcript;
                    console.log('🤖 ИИ:', transcript);
                    await saveMessage('assistant', transcript);
                  }
                }
              }
            }

            // Обработка ошибок
            else if (eventData.type === 'error') {
              console.error('❌ Ошибка от OpenAI:', eventData.error);
              setError(eventData.error?.message || 'Ошибка от сервера OpenAI');
            }
          }
        } catch (e) {
          console.error('Ошибка парсинга события:', e);
        }
      };

      // Создаем offer
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      // Получаем выбранную модель пользователя
      let selectedModel = 'gpt-realtime';
      if (userId) {
        try {
          const userData = await apiClient.getUser({ user_id: userId });
          if (userData.success && userData.data) {
            selectedModel = userData.data.user?.selected_model || 'gpt-realtime';
          }
        } catch (e) {
          console.error('Ошибка получения модели пользователя:', e);
        }
      }

      // Отправляем SDP на OpenAI
      const baseUrl = 'https://api.openai.com/v1/realtime/calls';

      const sdpResp = await fetch(`${baseUrl}?model=${encodeURIComponent(selectedModel)}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResp.ok) {
        throw new Error(`OpenAI API вернул статус: ${sdpResp.status}`);
      }

      const answerSdp = await sdpResp.text();
      await pcRef.current.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      setState('connected');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      setState('error');

      // Очистка при ошибке
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch (e) {
          // Игнорируем ошибки при закрытии
        }
        pcRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    }
  }, [saveMessage, checkTokenBalance, deductRemainingTokens, enforceMainSpeaker, initializeProximityDisabler, configureRTCForSpeaker, forceAudioToSpeaker, createSpeakerAudioContext, reconnectAttempts, maxReconnectAttempts, attemptReconnect, getMediaStream, interruptPlayback]);

  // Устанавливаем ссылку на функцию в ref
  connectInternalRef.current = connectInternal;

  // Основная функция подключения (сохраняет аргументы для переподключения)
  const connect = useCallback(async (userId?: number, selectedVoice?: string) => {
    // Сохраняем аргументы для возможного переподключения
    lastConnectArgsRef.current = { userId, selectedVoice };

    // Очищаем предыдущий таймер переподключения если есть
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    await connectInternal(userId, selectedVoice);
  }, [connectInternal]);

  const disconnect = useCallback(() => {
    cleanupConnection();
  }, [cleanupConnection]);

  // Функция для обновления баланса токенов
  const updateTokenBalance = useCallback(async (userId: number) => {
    await checkTokenBalance(userId);
  }, [checkTokenBalance]);

  // Мониторинг состояния интернет-соединения
  useEffect(() => {
    const handleOnline = () => {
      // Если было состояние ошибки из-за отсутствия интернета, пытаемся переподключиться
      if (state === 'error' && lastConnectArgsRef.current && reconnectAttempts < maxReconnectAttempts) {
        setError(null);
        attemptReconnect();
      }
    };

    const handleOffline = () => {
      if (state === 'connected' || state === 'connecting' || state === 'reconnecting') {
        setError('Нет подключения к интернету');
        setState('error');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state, reconnectAttempts, maxReconnectAttempts, attemptReconnect]);

  return {
    state,
    isConnected: state === 'connected' || state === 'listening' || state === 'thinking' || state === 'speaking',
    connect,
    disconnect,
    error,
    tokenBalance,
    canConnect,
    updateTokenBalance,
    reconnectAttempts,
    maxReconnectAttempts,
  };
}
