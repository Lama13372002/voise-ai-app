'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Modal from '@/components/ui/modal';
import PrivacyModal from '@/components/ui/privacy-modal';
import {
  Settings,
  Globe,
  Moon,
  Sun,
  Shield,
  HelpCircle,
  Info,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Database,
  Palette,
  UserCog,
  Crown
} from 'lucide-react';
import type { TelegramWebApp } from '@/types/telegram';

interface UserData {
  id: number;
  telegram_id: string;
  username?: string;
  first_name: string;
  last_name?: string;
  is_premium: boolean;
  has_active_subscription?: boolean;
  current_plan_name?: string;
}

interface SettingsPageProps {
  user: UserData | null;
  tg: TelegramWebApp | null;
  onUserUpdate?: () => void;
}

export default function SettingsPage({ user, tg, onUserUpdate }: SettingsPageProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'help' | 'faq' | 'about'>('help');
  const [modalTitle, setModalTitle] = useState('');
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  const [settings, setSettings] = useState(() => {
    // Попытаемся восстановить настройки из localStorage
    if (typeof window !== 'undefined') {
      const savedDarkMode = localStorage.getItem('tma-dark-mode');
      const isDarkMode = savedDarkMode ? JSON.parse(savedDarkMode) : (tg?.colorScheme === 'dark');
      return {
        darkMode: isDarkMode,
        language: 'ru',
      };
    }
    return {
      darkMode: tg?.colorScheme === 'dark' || false,
      language: 'ru',
    };
  });

  const toggleSetting = (key: string) => {
    tg?.HapticFeedback.impactOccurred('light');

    // Специальная логика для переключения темы
    if (key === 'darkMode') {
      const newDarkMode = !settings.darkMode;

      // Сохраняем новое состояние
      setSettings(prev => ({
        ...prev,
        darkMode: newDarkMode
      }));

      // Сохраняем в localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('tma-dark-mode', JSON.stringify(newDarkMode));
      }

      // Применяем изменения к документу
      if (newDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Обычное переключение для других настроек
      setSettings(prev => ({
        ...prev,
        [key]: !prev[key as keyof typeof prev]
      }));
    }
  };

  const updateSliderSetting = (key: string, value: number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  interface SettingItem {
    id: string;
    label: string;
    description?: string;
    type: 'slider' | 'toggle' | 'select' | 'link';
    value?: number | boolean | string;
    icon: React.ComponentType<{ className?: string }>;
    premium?: boolean;
    gradient?: string;
  }

  const settingSections = [
    {
      title: 'Внешний вид',
      icon: Palette,
      gradient: 'from-blue-500 to-indigo-500',
      bgGradient: 'from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20',
      items: [
        {
          id: 'darkMode',
          label: 'Темная тема',
          description: 'Переключение между светлой и темной темой',
          type: 'toggle' as const,
          value: settings.darkMode,
          icon: settings.darkMode ? Moon : Sun,
          gradient: 'from-slate-600 to-slate-700'
        },
        {
          id: 'language',
          label: 'Язык интерфейса',
          description: 'Выберите предпочитаемый язык',
          type: 'select' as const,
          value: 'Русский',
          icon: Globe,
          gradient: 'from-green-500 to-emerald-500'
        },
      ] as SettingItem[]
    },

    {
      title: 'Поддержка и информация',
      icon: HelpCircle,
      gradient: 'from-slate-500 to-slate-600',
      bgGradient: 'from-slate-50/50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-700/50',
      items: [
        {
          id: 'help',
          label: 'Справка и FAQ',
          description: 'Часто задаваемые вопросы',
          type: 'link' as const,
          icon: HelpCircle,
          gradient: 'from-blue-500 to-indigo-500'
        },
        {
          id: 'about',
          label: 'О приложении',
          description: 'Информация о версии и разработчиках',
          type: 'link' as const,
          icon: Info,
          gradient: 'from-cyan-500 to-blue-500'
        },
        {
          id: 'privacy',
          label: 'Политика конфиденциальности',
          description: 'Как мы защищаем ваши данные',
          type: 'link' as const,
          icon: Shield,
          gradient: 'from-green-500 to-emerald-500'
        },
      ] as SettingItem[]
    },
  ];

  const handleLinkClick = (id: string) => {
    tg?.HapticFeedback.impactOccurred('medium');

    if (id === 'help') {
      setModalType('faq');
      setModalTitle('Справка и FAQ');
      setModalOpen(true);
    } else if (id === 'about') {
      setModalType('about');
      setModalTitle('О приложении');
      setModalOpen(true);
    } else if (id === 'privacy') {
      setPrivacyModalOpen(true);
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      {/* Заголовок */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-200 dark:to-slate-100 bg-clip-text text-transparent">
          Настройки
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Настройте приложение под себя
        </p>
      </div>

      {/* Информация о версии */}
      <Card className="border-0 bg-gradient-to-br from-slate-50/50 via-blue-50/50 to-indigo-50/50 dark:from-slate-800/50 dark:via-blue-900/20 dark:to-indigo-900/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
        <CardContent className="pt-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-xl">
                <Settings className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
                  Голосовой ИИ
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Версия 1.0.0 • Beta
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-white/50 dark:bg-slate-800/50 shadow-md">
              <Database className="w-3 h-3 mr-1" />
              Обновлено
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Разделы настроек */}
      {settingSections.map((section) => {
        const SectionIcon = section.icon;

        return (
          <Card key={section.title} className={`border-0 bg-gradient-to-br ${section.bgGradient} overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
            <CardHeader className="pb-4 relative">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className={`w-10 h-10 bg-gradient-to-r ${section.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <SectionIcon className="w-5 h-5 text-white" />
                </div>
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-4">
                {section.items.map((item) => {
                  const ItemIcon = item.icon;

                  return (
                    <div key={item.id} className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 transition-all duration-200 hover:bg-white/70 dark:hover:bg-slate-800/70">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-10 h-10 bg-gradient-to-r ${item.gradient || section.gradient} rounded-xl flex items-center justify-center shadow-md`}>
                            <ItemIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                {item.label}
                              </span>
                              {item.premium && !user?.has_active_subscription && (
                                <Badge variant="warning" className="text-xs px-2 py-0.5">
                                  Pro
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                {item.description}
                              </p>
                            )}
                            {item.type === 'slider' && typeof item.value === 'number' && (
                              <div className="mt-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                      className={`h-2 bg-gradient-to-r ${item.gradient || section.gradient} rounded-full transition-all duration-300`}
                                      style={{ width: `${item.value}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-500 dark:text-slate-400 w-10 text-right font-medium">
                                    {item.value}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center ml-4">
                          {item.type === 'toggle' && (
                            <button
                              onClick={() => toggleSetting(item.id as keyof typeof settings)}
                              disabled={item.premium && !user?.has_active_subscription}
                              className={`transition-all duration-200 ${
                                item.premium && !user?.has_active_subscription
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'hover:scale-110'
                              }`}
                            >
                              {typeof item.value === 'boolean' && item.value ? (
                                <div className={`w-12 h-6 bg-gradient-to-r ${item.gradient || section.gradient} rounded-full flex items-center justify-end px-1 shadow-lg`}>
                                  <div className="w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200" />
                                </div>
                              ) : (
                                <div className="w-12 h-6 bg-slate-300 dark:bg-slate-600 rounded-full flex items-center justify-start px-1">
                                  <div className="w-4 h-4 bg-white dark:bg-slate-200 rounded-full shadow-md transition-transform duration-200" />
                                </div>
                              )}
                            </button>
                          )}

                          {item.type === 'select' && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                {item.value}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                          )}

                          {item.type === 'link' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLinkClick(item.id)}
                              className="p-2 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-xl"
                            >
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Информация об аккаунте */}
      {user && (
        <Card className="border-0 bg-gradient-to-br from-slate-50/50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-700/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-slate-500 to-slate-600 rounded-2xl flex items-center justify-center">
                <UserCog className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {user.first_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    ID: {user.telegram_id}
                  </p>
                </div>
              </div>
              {user.has_active_subscription && (
                <Badge variant="warning" className="shadow-md">
                  <Crown className="w-3 h-3 mr-1" />
                  Премиум
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Модальное окно для справки и FAQ */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        type={modalType}
      />

      {/* Модальное окно для политики конфиденциальности */}
      <PrivacyModal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
      />
    </div>
  );
}
