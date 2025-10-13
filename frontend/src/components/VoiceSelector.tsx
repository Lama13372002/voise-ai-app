'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Lock, Volume2, User } from 'lucide-react';
import type { TelegramWebApp } from '@/types/telegram';

interface VoiceInfo {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
  accent: string;
  plan: number; // Минимальный план для доступа
}

interface UserData {
  id: number;
  telegram_id: string;
  username?: string;
  first_name: string;
  last_name?: string;
  is_premium: boolean;
  has_active_subscription?: boolean;
  current_plan_name?: string;
  selected_voice?: string;
}

interface VoiceSelectorProps {
  user: UserData | null;
  tg: TelegramWebApp | null;
  onVoiceChange?: (voice: string) => void;
}

// Конфигурация голосов по планам
const VOICES: VoiceInfo[] = [
  // План 1 (Базовый) - 2 голоса
  {
    id: 'ash',
    name: 'Ash',
    description: 'Теплый мужской голос',
    gender: 'male',
    accent: 'Американский',
    plan: 1
  },
  {
    id: 'marin',
    name: 'Marin',
    description: 'Дружелюбный женский голос',
    gender: 'female',
    accent: 'Американский',
    plan: 1
  },

  // План 2 (Премиум) - дополнительно 4 голоса
  {
    id: 'alloy',
    name: 'Alloy',
    description: 'Современный унисекс голос',
    gender: 'male',
    accent: 'Нейтральный',
    plan: 2
  },
  {
    id: 'ballad',
    name: 'Ballad',
    description: 'Мелодичный мужской голос',
    gender: 'male',
    accent: 'Британский',
    plan: 2
  },
  {
    id: 'cedar',
    name: 'Cedar',
    description: 'Глубокий мужской голос',
    gender: 'male',
    accent: 'Американский',
    plan: 2
  },
  {
    id: 'coral',
    name: 'Coral',
    description: 'Энергичный женский голос',
    gender: 'female',
    accent: 'Американский',
    plan: 2
  },

  // План 3 (Про) - дополнительно 4 голоса
  {
    id: 'echo',
    name: 'Echo',
    description: 'Спокойный мужской голос',
    gender: 'male',
    accent: 'Американский',
    plan: 3
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Мудрый мужской голос',
    gender: 'male',
    accent: 'Британский',
    plan: 3
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    description: 'Яркий женский голос',
    gender: 'female',
    accent: 'Американский',
    plan: 3
  },
  {
    id: 'verse',
    name: 'Verse',
    description: 'Выразительный унисекс голос',
    gender: 'male',
    accent: 'Нейтральный',
    plan: 3
  }
];

const getPlanName = (planNumber: number): string => {
  switch (planNumber) {
    case 1: return 'Базовый';
    case 2: return 'Премиум';
    case 3: return 'Про';
    default: return 'Неизвестный';
  }
};

const getPlanColor = (planNumber: number): string => {
  switch (planNumber) {
    case 1: return 'bg-blue-500';
    case 2: return 'bg-purple-500';
    case 3: return 'bg-orange-500';
    default: return 'bg-gray-500';
  }
};

export default function VoiceSelector({ user, tg, onVoiceChange }: VoiceSelectorProps) {
  const [selectedVoice, setSelectedVoice] = useState<string>(user?.selected_voice || 'ash');
  const [isOpen, setIsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [userPlan, setUserPlan] = useState<number>(1); // По умолчанию базовый план
  const [currentPlanName, setCurrentPlanName] = useState<string>('Базовый');
  const [loadingPlan, setLoadingPlan] = useState(false);

  // Функция для получения актуального плана пользователя
  const fetchCurrentPlan = async () => {
    if (!user?.id) return;

    try {
      setLoadingPlan(true);
      const response = await fetch(`/api/user-current-plan?user_id=${user.id}`);
      const data = await response.json();

      if (data.success) {
        const planName = data.current_plan_name || 'Бесплатный план';
        setCurrentPlanName(planName);

        // Определяем номер плана по имени
        let planNumber = 1;
        switch (planName.toLowerCase()) {
          case 'базовый':
            planNumber = 1;
            break;
          case 'премиум':
            planNumber = 2;
            break;
          case 'про':
            planNumber = 3;
            break;
          default:
            planNumber = 1; // Бесплатный или любой другой = базовый
        }

        setUserPlan(planNumber);
        console.log('Current plan updated:', planName, 'Plan number:', planNumber);
      }
    } catch (error) {
      console.error('Error fetching current plan:', error);
    } finally {
      setLoadingPlan(false);
    }
  };

  // Получаем актуальный план при монтировании компонента
  useEffect(() => {
    fetchCurrentPlan();
  }, [user?.id]);

  // Определяем план пользователя из props как fallback
  useEffect(() => {
    if (user?.current_plan_name && !loadingPlan) {
      const planName = user.current_plan_name;
      setCurrentPlanName(planName);

      switch (planName.toLowerCase()) {
        case 'базовый':
          setUserPlan(1);
          break;
        case 'премиум':
          setUserPlan(2);
          break;
        case 'про':
          setUserPlan(3);
          break;
        default:
          setUserPlan(1);
      }
    }
  }, [user?.current_plan_name, loadingPlan]);

  const handleVoiceSelect = async (voiceId: string) => {
    if (!user?.id) return;

    // Проверяем доступность голоса
    const voice = VOICES.find(v => v.id === voiceId);
    if (!voice || voice.plan > userPlan) {
      tg?.showAlert(`Голос "${voice?.name}" доступен только в плане "${getPlanName(voice?.plan || 1)}" и выше.`);
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch('/api/user-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          voice: voiceId
        })
      });

      if (response.ok) {
        setSelectedVoice(voiceId);
        setIsOpen(false);
        onVoiceChange?.(voiceId);
        tg?.HapticFeedback.impactOccurred('light');
      } else {
        throw new Error('Не удалось обновить голос');
      }
    } catch (error) {
      console.error('Ошибка обновления голоса:', error);
      tg?.showAlert('Ошибка при обновлении голоса');
    } finally {
      setUpdating(false);
    }
  };

  const isVoiceAvailable = (voice: VoiceInfo): boolean => {
    return voice.plan <= userPlan;
  };

  const currentVoice = VOICES.find(v => v.id === selectedVoice);

  return (
    <div className="space-y-4">
      {/* Текущий выбранный голос */}
      <Card className="border-0 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center">
                {currentVoice?.gender === 'female' ? (
                  <User className="w-6 h-6 text-white" />
                ) : (
                  <Volume2 className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Текущий голос
                </div>
                <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                  {currentVoice?.name} {currentVoice?.gender === 'female' ? '♀' : '♂'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {currentVoice?.description}
                </div>
              </div>
            </div>
            <Button
              onClick={() => {
                setIsOpen(!isOpen);
                // Обновляем план при открытии селектора
                if (!isOpen) {
                  fetchCurrentPlan();
                }
              }}
              variant="outline"
              size="sm"
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:hover:bg-indigo-900/20"
              disabled={loadingPlan}
            >
              {loadingPlan ? 'Загрузка...' : 'Изменить'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Селектор голосов */}
      {isOpen && (
        <Card className="border-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-orange-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Выберите голос
              </span>
              <Badge variant="outline" className="text-xs">
                Ваш план: {currentPlanName}
              </Badge>
              {loadingPlan && (
                <span className="text-xs text-slate-400 ml-2">Обновление...</span>
              )}
            </div>

            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {VOICES.map((voice) => {
                const isAvailable = isVoiceAvailable(voice);
                const isSelected = voice.id === selectedVoice;

                return (
                  <div
                    key={voice.id}
                    onClick={() => isAvailable && !updating && handleVoiceSelect(voice.id)}
                    className={`
                      p-3 rounded-xl border transition-all cursor-pointer
                      ${isAvailable
                        ? 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-60 cursor-not-allowed'
                      }
                      ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-300' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center
                          ${isAvailable ? getPlanColor(voice.plan) : 'bg-slate-400'}
                        `}>
                          {voice.gender === 'female' ? (
                            <User className="w-5 h-5 text-white" />
                          ) : (
                            <Volume2 className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isAvailable ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500'}`}>
                              {voice.name} {voice.gender === 'female' ? '♀' : '♂'}
                            </span>
                            {voice.plan > 1 && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${getPlanColor(voice.plan)} text-white border-0`}
                              >
                                {getPlanName(voice.plan)}
                              </Badge>
                            )}
                          </div>
                          <div className={`text-xs ${isAvailable ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400'}`}>
                            {voice.description} • {voice.accent}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isAvailable && (
                          <Lock className="w-4 h-4 text-slate-400" />
                        )}
                        {isSelected && isAvailable && (
                          <Check className="w-4 h-4 text-indigo-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600">
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Базовый план: 2 голоса</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span>Премиум план: +4 голоса</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span>Про план: все голоса</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
