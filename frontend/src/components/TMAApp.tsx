'use client';

import { useEffect, useState } from 'react';
import type { TelegramWebApp, TelegramUser } from '@/types/telegram';
import { Mic, User, Crown, Settings } from 'lucide-react';
import VoiceAIPage from './pages/VoiceAIPage';
import ProfilePage from './pages/ProfilePage';
import PlansPage from './pages/PlansPage';
import SettingsPage from './pages/SettingsPage';
import { apiClient } from '@/lib/api-client';
import { initMockTelegramWebApp } from '@/lib/telegram-mock';

type Page = 'voice' | 'profile' | 'plans' | 'settings';

interface UserData {
  id: number;
  telegram_id: string;
  username?: string;
  first_name: string;
  last_name?: string;
  is_premium: boolean;
  token_balance: number; // Обязательное поле для токенов
  has_active_subscription?: boolean;
  current_plan_name?: string;
}

export default function TMAApp() {
  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('voice');
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Функция для обновления данных пользователя
  const refreshUserData = async () => {
    if (!user?.telegram_id) return;

    try {
      setRefreshing(true);
      const result = await apiClient.getUser({ telegram_id: user.telegram_id });

      if (result.success && result.data) {
        setUser(result.data.user);
        console.log('User data refreshed:', result.data.user);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Инициализируем мок если не в Telegram
      if (!window.Telegram?.WebApp) {
        initMockTelegramWebApp();
      }

      const telegram = window.Telegram?.WebApp;
      if (!telegram) return;

      setTg(telegram);

      // Настраиваем тему и расширяем приложение
      telegram.ready();
      telegram.expand();

      // Восстанавливаем сохраненную тему или используем тему Telegram
      const savedDarkMode = localStorage.getItem('tma-dark-mode');
      let isDarkMode = false;

      if (savedDarkMode !== null) {
        // Если есть сохраненная настройка, используем её
        isDarkMode = JSON.parse(savedDarkMode);
      } else {
        // Иначе используем тему из Telegram
        isDarkMode = telegram.colorScheme === 'dark';
      }

      // Применяем тему
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.setProperty('--background', telegram.themeParams.bg_color || '#0a0a0a');
        document.documentElement.style.setProperty('--foreground', telegram.themeParams.text_color || '#ffffff');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Регистрируем/обновляем пользователя
      if (telegram.initDataUnsafe.user) {
        registerUser(telegram.initDataUnsafe.user);
      }
    }
  }, []);

  const registerUser = async (telegramUser: NonNullable<TelegramUser>) => {
    try {
      const result = await apiClient.createOrUpdateUser({
        telegram_id: telegramUser.id.toString(),
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        language_code: telegramUser.language_code,
      });

      if (result.success && result.data) {
        setUser(result.data.user);
      }
    } catch (error) {
      console.error('Error registering user:', error);
    } finally {
      setLoading(false);
    }
  };

  // Обновляем данные пользователя при смене страниц на главную (voice)
  useEffect(() => {
    if (currentPage === 'voice' && user?.telegram_id && !loading) {
      refreshUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Обновляем данные пользователя при фокусе на приложение
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.telegram_id && !loading) {
        refreshUserData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.telegram_id, loading]);

  const navigation = [
    {
      id: 'voice',
      label: 'Голос',
      icon: Mic,
      gradient: 'from-blue-500 to-indigo-500',
      color: 'text-blue-500'
    },
    {
      id: 'profile',
      label: 'Профиль',
      icon: User,
      gradient: 'from-emerald-500 to-teal-500',
      color: 'text-emerald-500'
    },
    {
      id: 'plans',
      label: 'Токены',
      icon: Crown,
      gradient: 'from-purple-500 to-pink-500',
      color: 'text-purple-500'
    },
    {
      id: 'settings',
      label: 'Настройки',
      icon: Settings,
      gradient: 'from-slate-500 to-slate-600',
      color: 'text-slate-500'
    }
  ];

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'voice':
        return <VoiceAIPage user={user} tg={tg} onUserUpdate={refreshUserData} />;
      case 'profile':
        return <ProfilePage user={user} tg={tg} onUserUpdate={refreshUserData} />;
      case 'plans':
        return <PlansPage user={user} tg={tg} onUserUpdate={refreshUserData} />;
      case 'settings':
        return <SettingsPage user={user} tg={tg} onUserUpdate={refreshUserData} />;
      default:
        return <VoiceAIPage user={user} tg={tg} onUserUpdate={refreshUserData} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl animate-pulse"></div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">
              Голосовой ИИ
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Инициализация приложения...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Основной контент */}
      <div className="pb-20">
        {renderCurrentPage()}
      </div>

      {/* Нижняя навигация */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-md mx-auto px-4 py-2">
          <div className="flex items-center justify-around">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id as Page);
                    tg?.HapticFeedback.impactOccurred('light');
                  }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? `bg-gradient-to-r ${item.gradient} shadow-lg`
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-white' : item.color
                    }`}
                  />
                  <span
                    className={`text-xs font-medium transition-colors ${
                      isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
