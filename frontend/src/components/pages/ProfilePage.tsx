'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Clock, Crown, Zap, Activity } from 'lucide-react';
import type { TelegramWebApp } from '@/types/telegram';
import PlanModal from '@/components/PlanModal';
import { apiClient, type CurrentPlanResponse } from '@/lib/api-client';

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

// Using CurrentPlanResponse from api-client instead of local interface

interface ProfilePageProps {
  user: UserData | null;
  tg: TelegramWebApp | null;
  onUserUpdate?: () => void;
}

export default function ProfilePage({ user, tg, onUserUpdate }: ProfilePageProps) {
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<CurrentPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentPlan = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.getCurrentUserPlan(user.id);

      if (response.success && response.data) {
        setCurrentPlan(response.data);

        // Показываем уведомление если план истек
        if (response.data.plan_expired) {
          tg?.showAlert('Ваш план завершен - все токены использованы. План перемещен в завершенные.');
        }
      }
    } catch (error) {
      console.error('Error fetching current plan:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, tg]);

  // Получаем информацию о текущем плане пользователя
  useEffect(() => {
    if (user?.id) {
      fetchCurrentPlan();
    }
  }, [user?.id, fetchCurrentPlan]);

  if (!user) {
    return (
      <div className="p-4 space-y-6 max-w-md mx-auto">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-emerald-400 to-teal-500 rounded-3xl animate-pulse mb-4 flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  // Показываем загрузку если данные еще загружаются
  if (loading) {
    return (
      <div className="p-4 space-y-6 max-w-md mx-auto">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-emerald-400 to-teal-500 rounded-3xl animate-pulse mb-4 flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">Загрузка данных профиля...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      {/* Заголовок */}
      <div className="text-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Профиль
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
          Информация о вашем аккаунте
        </p>
      </div>

      {/* Профильная карточка */}
      <Card className="border-0 bg-gradient-to-br from-emerald-50/50 via-teal-50/50 to-cyan-50/50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            {/* Аватар */}
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/30 relative">
                <User className="w-10 h-10 text-white" />
                {currentPlan?.has_active_subscription && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              {/* Активность индикатор */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {user.first_name} {user.last_name}
              </h2>
              {user.username && (
                <p className="text-slate-600 dark:text-slate-400 text-sm">@{user.username}</p>
              )}

              <div className="flex items-center gap-2 mt-3">
                {currentPlan?.has_active_subscription ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="warning" className="text-yellow-900">
                      <Crown className="w-3 h-3 mr-1" />
                      {currentPlan.current_plan_name}
                    </Badge>
                    {currentPlan.tokens_remaining_in_plan !== undefined && currentPlan.tokens_remaining_in_plan > 0 ? (
                      <Badge variant="success" className="text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        Активен
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Токены закончились
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
                      Нет активного плана
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Activity className="w-3 h-3 mr-1" />
                      Базовые токены
                    </Badge>
                  </div>
                )}
              </div>

              {/* Показываем информацию о токенах в текущем плане */}
              {currentPlan && (
                <div className="mt-3 space-y-1">
                  {currentPlan.has_active_subscription && currentPlan.tokens_remaining_in_plan !== undefined ? (
                    <div className="text-sm">
                      <span className="text-slate-600 dark:text-slate-400">В текущем плане: </span>
                      {currentPlan.tokens_remaining_in_plan > 0 ? (
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {currentPlan.tokens_remaining_in_plan.toLocaleString()} токенов осталось
                        </span>
                      ) : (
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          Все токены использованы
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Статус: </span>
                      <span className="font-semibold text-orange-600 dark:text-orange-400">
                        Купите план для получения токенов
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Быстрые действия - переделанный блок с одной кнопкой */}
      <Card className="border-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-800/50 dark:to-pink-900/20">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-purple-500" />
                Управление планами
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Просмотрите информацию о ваших планах
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full h-16 flex-col gap-2 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-200/50 dark:border-purple-700/50 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/50 dark:hover:to-pink-900/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              onClick={() => {
                tg?.HapticFeedback.impactOccurred('light');
                setIsPlanModalOpen(true);
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Мои планы</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Активные и завершенные</div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Модальное окно планов */}
      <PlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        user={user}
        tg={tg}
      />
    </div>
  );
}
