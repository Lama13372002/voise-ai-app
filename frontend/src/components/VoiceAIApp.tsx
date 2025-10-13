'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVoiceAI } from '@/hooks/useVoiceAI';
import { Mic, MicOff, Phone, PhoneOff, Loader2, MessageCircle, Waves } from 'lucide-react';
import type { TelegramWebApp } from '@/types/telegram';
import ModelSelector from '@/components/ModelSelector';

export default function VoiceAIApp() {
  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<{
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  } | null>(null);
  const { state, isConnected, connect, disconnect, error, tokenBalance, canConnect, updateTokenBalance, reconnectAttempts, maxReconnectAttempts } = useVoiceAI();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const telegram = window.Telegram.WebApp;
      setTg(telegram);
      const telegramUser = telegram.initDataUnsafe.user || null;
      setUser(telegramUser);

      // Настраиваем тему и расширяем приложение
      telegram.ready();
      telegram.expand();

      // Настраиваем цвета в соответствии с темой Telegram
      if (telegram.colorScheme === 'dark') {
        document.documentElement.style.setProperty('--background', telegram.themeParams.bg_color || '#1a1a1a');
        document.documentElement.style.setProperty('--foreground', telegram.themeParams.text_color || '#ffffff');
      }

      // Проверяем баланс токенов при загрузке
      if (telegramUser?.id) {
        updateTokenBalance(telegramUser.id);
      }
    }
  }, [updateTokenBalance]);

  const handleConnect = async () => {
    if (!canConnect || !user?.id) {
      return;
    }

    tg?.HapticFeedback.impactOccurred('medium');
    // Передаем ID пользователя для правильной настройки сессии
    await connect(user.id);
  };

  const handleDisconnect = () => {
    tg?.HapticFeedback.impactOccurred('light');
    disconnect();
  };

  const getStatusBadge = () => {
    switch (state) {
      case 'idle':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Phone className="w-3 h-3" />
          Не подключен
        </Badge>;
      case 'connecting':
        return <Badge variant="outline" className="flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Подключение...
        </Badge>;
      case 'connected':
        return <Badge className="flex items-center gap-1 bg-green-500 hover:bg-green-600">
          <Waves className="w-3 h-3" />
          Подключен
        </Badge>;
      case 'reconnecting':
        return <Badge variant="outline" className="flex items-center gap-1 border-orange-500 text-orange-600">
          <Loader2 className="w-3 h-3 animate-spin" />
          Переподключение... ({reconnectAttempts}/{maxReconnectAttempts})
        </Badge>;
      case 'error':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <PhoneOff className="w-3 h-3" />
          Ошибка
        </Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Заголовок */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Голосовой ИИ
          </h1>
          {user && (
            <p className="text-slate-600 dark:text-slate-400">
              Привет, {user.first_name}! 👋
            </p>
          )}
        </div>

        {/* Статус подключения */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Статус</CardTitle>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              {isConnected
                ? "Говорите в микрофон, ИИ вас слушает и ответит голосом"
                : state === 'reconnecting'
                  ? `Восстанавливаем соединение... Попытка ${reconnectAttempts} из ${maxReconnectAttempts}`
                  : !canConnect
                    ? "Для использования голосового ИИ необходимо приобрести подписку"
                    : "Нажмите кнопку ниже для подключения к голосовому ИИ"
              }
            </CardDescription>
          </CardContent>
        </Card>

        {/* Статус переподключения */}
        {state === 'reconnecting' && (
          <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
            <Loader2 className="w-4 h-4 animate-spin" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              Восстанавливаем соединение... Попытка {reconnectAttempts} из {maxReconnectAttempts}
              <br />
              <span className="text-xs opacity-75">
                Проверьте подключение к интернету, если проблема повторяется
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Ошибка */}
        {error && state !== 'reconnecting' && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Информация о токенах */}
        {tokenBalance !== null && (
          <Card className={tokenBalance <= 2000 ? "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800" : "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800"}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Баланс токенов:</span>
                <Badge variant={tokenBalance > 2000 ? "default" : "destructive"}>
                  {tokenBalance.toLocaleString()}
                </Badge>
              </div>
              {tokenBalance <= 2000 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Недостаточно токенов для использования. Приобретите подписку.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Выбор модели */}
        {user?.id && (
          <Card>
            <CardContent className="pt-4">
              <ModelSelector
                userId={user.id}
                disabled={isConnected}
              />
            </CardContent>
          </Card>
        )}

        {/* Кнопка подключения */}
        <Card>
          <CardContent className="pt-6">
            {!isConnected ? (
              <Button
                onClick={handleConnect}
                disabled={state === 'connecting' || state === 'reconnecting' || !canConnect}
                className={`w-full h-14 text-lg font-semibold ${
                  canConnect && state !== 'reconnecting'
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
                size="lg"
              >
                {state === 'connecting' ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Подключение...
                  </div>
                ) : state === 'reconnecting' ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Переподключение...
                  </div>
                ) : !canConnect ? (
                  <div className="flex items-center gap-2">
                    <MicOff className="w-5 h-5 mr-2" />
                    Недостаточно токенов
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5 mr-2" />
                    Подключиться
                  </div>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-700 dark:text-green-300 font-medium">
                      Запись активна
                    </span>
                  </div>
                </div>
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  className="w-full h-12"
                  size="lg"
                >
                  <MicOff className="w-4 h-4 mr-2" />
                  Отключиться
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Инструкции */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">💡 Как использовать:</p>
              <ul className="space-y-1 text-xs">
                <li>• Нажмите "Подключиться" для начала</li>
                <li>• Разрешите доступ к микрофону</li>
                <li>• Говорите обычным голосом</li>
                <li>• ИИ ответит голосом через динамики</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
