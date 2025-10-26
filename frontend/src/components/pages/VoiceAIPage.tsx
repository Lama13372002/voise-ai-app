'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVoiceAI } from '@/hooks/useVoiceAI';
import { useAudioInit } from '@/hooks/useAudioInit';
import { Mic, MicOff, Phone, PhoneOff, Loader2, MessageCircle, Waves, Sparkles, Volume2, Headphones, Zap, Clock, Crown, Coins } from 'lucide-react';
import type { TelegramWebApp } from '@/types/telegram';
import { useState, useEffect, useCallback } from 'react';
import VoiceSelector from '@/components/VoiceSelector';
import PromptSelector from '@/components/PromptSelector';
import ModelSelector from '@/components/ModelSelector';
import { apiClient } from '@/lib/api-client';

interface UserData {
  id: number;
  telegram_id: string;
  username?: string;
  first_name: string;
  last_name?: string;
  is_premium: boolean;
  has_active_subscription?: boolean;
  current_plan_name?: string;
  token_balance?: number;
  selected_voice?: string;
}

interface VoiceAIPageProps {
  user: UserData | null;
  tg: TelegramWebApp | null;
  onUserUpdate?: () => void;
}

export default function VoiceAIPage({ user, tg, onUserUpdate }: VoiceAIPageProps) {
  const { state, isConnected, connect, disconnect, error } = useVoiceAI();
  const { isAudioReady, initAudio } = useAudioInit();
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<string>(user?.selected_voice || 'ash');

  const fetchTokenBalance = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoadingTokens(true);
      const data = await apiClient.getTokenBalance(user.id);

      if (data.success && data.data) {
        setTokenBalance(data.data.token_balance);
      }
    } catch (error) {
      console.error('Error fetching token balance:', error);
    } finally {
      setLoadingTokens(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchTokenBalance();
    }
  }, [user?.id, fetchTokenBalance]);

  // Обновляем selectedVoice при изменении user
  useEffect(() => {
    if (user?.selected_voice) {
      setSelectedVoice(user.selected_voice);
    }
  }, [user?.selected_voice]);

  const handleConnect = async () => {
    // Проверяем баланс токенов перед подключением
    if (tokenBalance < 100) {
      tg?.showAlert('Недостаточно токенов для голосового общения. Пожалуйста, пополните баланс.');
      return;
    }

    // КРИТИЧНО: Инициализируем аудио систему перед подключением
    // Это решает проблему с earpiece при первом запуске TMA
    await initAudio();

    tg?.HapticFeedback.impactOccurred('medium');
    // Передаем user_id и выбранный голос для подключения
    await connect(user?.id, selectedVoice);
  };

  const handleDisconnect = () => {
    tg?.HapticFeedback.impactOccurred('light');
    disconnect();
  };

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    // Если подключен, отключаемся чтобы пользователь мог переподключиться с новым голосом
    if (isConnected) {
      tg?.showAlert('Голос изменен. Переподключитесь для применения изменений.');
      disconnect();
    }
  };

  const handlePromptChange = (promptId: number) => {
    // Если подключен к голосовому чату, отключаемся для применения нового промпта
    if (isConnected) {
      tg?.showAlert('Промпт изменен. Переподключитесь для применения изменений.');
      disconnect();
    }
  };

  const formatTokenBalance = (balance: number) => {
    if (balance >= 1000000) {
      return `${(balance / 1000000).toFixed(1)}M`;
    } else if (balance >= 1000) {
      return `${(balance / 1000).toFixed(1)}K`;
    }
    return balance.toString();
  };

  const getTokenBalanceColor = (balance: number) => {
    if (balance < 100) return 'text-red-600 dark:text-red-400';
    if (balance < 1000) return 'text-orange-600 dark:text-orange-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  const getStatusBadge = () => {
    switch (state) {
      case 'idle':
        return <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
          <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
          Не подключен
        </Badge>;
      case 'connecting':
        return <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
          Подключение...
        </Badge>;
      case 'connected':
        return <Badge variant="success" className="flex items-center gap-1.5 px-3 py-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          Готов к общению
        </Badge>;
      case 'listening':
        return <Badge variant="default" className="flex items-center gap-1.5 px-3 py-1">
          <Waves className="w-3 h-3 animate-pulse" />
          Слушаю...
        </Badge>;
      case 'thinking':
        return <Badge variant="success" className="flex items-center gap-1.5 px-3 py-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          Готов к общению
        </Badge>;
      case 'speaking':
        return <Badge variant="success" className="flex items-center gap-1.5 px-3 py-1">
          <Volume2 className="w-3 h-3 animate-pulse" />
          Отвечаю...
        </Badge>;
      default:
        return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      {/* Заголовок */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Голосовой ИИ
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Общайтесь с ИИ голосом в реальном времени
        </p>
      </div>

      {/* Выбор промпта */}
      <PromptSelector
        user={user}
        tg={tg}
        onPromptChange={handlePromptChange}
      />

      {/* Выбор модели */}
      {user && (
        <ModelSelector
          userId={user.id}
          disabled={isConnected}
        />
      )}

      {/* Выбор голоса */}
      <VoiceSelector
        user={user}
        tg={tg}
        onVoiceChange={handleVoiceChange}
      />

      {/* Баланс токенов */}
      <Card className="border-0 bg-gradient-to-br from-emerald-50/50 via-teal-50/50 to-cyan-50/50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Баланс токенов
                </div>
                <div className={`text-2xl font-bold ${getTokenBalanceColor(tokenBalance)}`}>
                  {loadingTokens ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Загрузка...</span>
                    </div>
                  ) : (
                    formatTokenBalance(tokenBalance)
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTokenBalance}
              className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            >
              <Zap className="w-4 h-4" />
            </Button>
          </div>

          {tokenBalance < 100 && !loadingTokens && (
            <Alert className="mt-3 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
              <AlertDescription className="text-orange-700 dark:text-orange-300 text-sm">
                Недостаточно токенов для голосового общения. Пополните баланс в разделе "Планы".
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Основная карточка голосового интерфейса */}
      <Card className="border-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/50 to-purple-50/50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 overflow-hidden">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-2 text-lg">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            Голосовое общение
          </CardTitle>
          <CardDescription>
            Нажмите кнопку для начала разговора с ИИ
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Статус подключения */}
          <div className="flex justify-center">
            {getStatusBadge()}
          </div>

          {/* Основная кнопка */}
          <div className="flex justify-center">
            {!isConnected ? (
              <Button
                onClick={handleConnect}
                disabled={tokenBalance < 100 && !loadingTokens || state === 'connecting'}
                className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                size="lg"
              >
                <div className="flex flex-col items-center gap-1">
                  {state === 'connecting' ? (
                    <>
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                      <span className="text-xs text-white font-medium">Жди...</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-8 h-8 text-white" />
                      <span className="text-xs text-white font-medium">Начать</span>
                    </>
                  )}
                </div>
              </Button>
            ) : (
              <Button
                onClick={handleDisconnect}
                disabled={state === 'listening' || state === 'thinking'}
                className="w-24 h-24 rounded-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-2xl hover:shadow-red-500/30 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                size="lg"
              >
                <div className="flex flex-col items-center gap-1">
                  <PhoneOff className="w-8 h-8 text-white" />
                  <span className="text-xs text-white font-medium">
                    {state === 'listening' ? 'Слушаю' : state === 'thinking' ? 'Думаю...' : 'Завершить'}
                  </span>
                </div>
              </Button>
            )}
          </div>

          {/* Ошибки */}
          {error && (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
              <AlertDescription className="text-red-700 dark:text-red-300">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Статистика в современном дизайне */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-blue-900/20 overflow-hidden">
          <CardContent className="p-4 text-center relative">
            <div className="absolute top-2 right-2">
              <Coins className="w-4 h-4 text-blue-500/40" />
            </div>
            <div className="space-y-2">
              <div className={`text-2xl font-bold ${getTokenBalanceColor(tokenBalance)}`}>
                {loadingTokens ? '...' : formatTokenBalance(tokenBalance)}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                токенов доступно
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-purple-900/20 overflow-hidden">
          <CardContent className="p-4 text-center relative">
            <div className="absolute top-2 right-2">
              <Volume2 className="w-4 h-4 text-purple-500/40" />
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                HD
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                качество звука
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Советы в современном дизайне */}
      <Card className="border-0 bg-gradient-to-br from-amber-50/50 via-orange-50/50 to-yellow-50/50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-yellow-900/20">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-amber-800 dark:text-amber-200">
                Советы для лучшего результата
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                <Headphones className="w-4 h-4 text-amber-500" />
                <span className="text-amber-700 dark:text-amber-300">
                  Используйте наушники
                </span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                <Mic className="w-4 h-4 text-orange-500" />
                <span className="text-orange-700 dark:text-orange-300">
                  Говорите четко
                </span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-700 dark:text-yellow-300">
                  Стабильный интернет
                </span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                <Volume2 className="w-4 h-4 text-red-500" />
                <span className="text-red-700 dark:text-red-300">
                  Тихое место
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
