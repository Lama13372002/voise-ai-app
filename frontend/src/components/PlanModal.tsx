'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Crown,
  X,
  Coins,
  Calendar,
  Check,
  Clock,
  Archive,
  Sparkles,
  TrendingUp,
  Zap
} from 'lucide-react';
import type { TelegramWebApp, TelegramUser } from '@/types/telegram';

interface UserPlan {
  id: number;
  plan_name: string;
  token_amount: number;
  tokens_used: number;
  tokens_remaining: number;
  start_date: string;
  end_date?: string;
  status: 'active' | 'expired' | 'cancelled';
  features: string[];
}

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: TelegramUser | undefined;
  tg: TelegramWebApp | null;
}

export default function PlanModal({ isOpen, onClose, user, tg }: PlanModalProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const [activePlans, setActivePlans] = useState<UserPlan[]>([]);
  const [closedPlans, setClosedPlans] = useState<UserPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserPlans = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/user-plans?user_id=${user.id}`);
      const data = await response.json();

      if (data.success) {
        setActivePlans(data.active_plans || []);
        setClosedPlans(data.closed_plans || []);
      } else {
        console.error('Error fetching plans:', data.error);
        // Fallback to empty arrays if API fails
        setActivePlans([]);
        setClosedPlans([]);
      }
    } catch (error) {
      console.error('Error fetching user plans:', error);
      // Fallback to empty arrays if API fails
      setActivePlans([]);
      setClosedPlans([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Пока используем моковые данные, потом заменим на реальный API
  useEffect(() => {
    if (isOpen && user) {
      fetchUserPlans();
    }
  }, [isOpen, user, fetchUserPlans]);

  const formatTokenAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getTokenUsagePercentage = (used: number, total: number) => {
    return Math.round((used / total) * 100);
  };

  const getPlanTheme = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'базовый':
      case 'стартер':
        return {
          gradient: 'from-blue-500 to-indigo-500',
          bgGradient: 'from-blue-50/50 via-indigo-50/50 to-blue-50/50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-blue-900/20',
          textColor: 'text-blue-600 dark:text-blue-400',
        };
      case 'премиум':
        return {
          gradient: 'from-purple-500 to-pink-500',
          bgGradient: 'from-purple-50/50 via-pink-50/50 to-purple-50/50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-purple-900/20',
          textColor: 'text-purple-600 dark:text-purple-400',
        };
      case 'про':
      case 'безлимит':
        return {
          gradient: 'from-orange-500 via-red-500 to-pink-500',
          bgGradient: 'from-orange-50/50 via-red-50/50 to-pink-50/50 dark:from-orange-900/20 dark:via-red-900/20 dark:to-pink-900/20',
          textColor: 'text-orange-600 dark:text-orange-400',
        };
      default:
        return {
          gradient: 'from-slate-500 to-slate-600',
          bgGradient: 'from-slate-50/50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-700/50',
          textColor: 'text-slate-600 dark:text-slate-400',
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Мои планы</h2>
                <p className="text-purple-100 text-sm">Управление токенами</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                tg?.HapticFeedback.impactOccurred('light');
                onClose();
              }}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Переключатель */}
        <div className="p-6 pb-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1">
            <Button
              variant={activeTab === 'active' ? 'default' : 'ghost'}
              className={`flex-1 rounded-xl transition-all duration-300 ${
                activeTab === 'active'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              onClick={() => {
                setActiveTab('active');
                tg?.HapticFeedback.impactOccurred('light');
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Активные
            </Button>
            <Button
              variant={activeTab === 'closed' ? 'default' : 'ghost'}
              className={`flex-1 rounded-xl transition-all duration-300 ${
                activeTab === 'closed'
                  ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-lg'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              onClick={() => {
                setActiveTab('closed');
                tg?.HapticFeedback.impactOccurred('light');
              }}
            >
              <Archive className="w-4 h-4 mr-2" />
              Завершенные
            </Button>
          </div>
        </div>

        {/* Контент */}
        <div className="px-6 pb-6 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl animate-pulse mb-4 flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <p className="text-slate-600 dark:text-slate-400">Загрузка планов...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab === 'active' ? (
                activePlans.length > 0 ? (
                  activePlans.map((plan) => {
                    const theme = getPlanTheme(plan.plan_name);
                    const usagePercentage = getTokenUsagePercentage(plan.tokens_used, plan.token_amount);

                    return (
                      <Card key={plan.id} className={`border-0 bg-gradient-to-br ${theme.bgGradient} overflow-hidden`}>
                        <CardContent className="p-5">
                          <div className="space-y-4">
                            {/* Заголовок плана */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 bg-gradient-to-r ${theme.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                                  <Crown className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-slate-800 dark:text-slate-200">
                                    {plan.plan_name}
                                  </h3>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    С {formatDate(plan.start_date)}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="success" className="font-bold">
                                <Check className="w-3 h-3 mr-1" />
                                Активен
                              </Badge>
                            </div>

                            {/* Прогресс токенов */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                  Использовано токенов
                                </span>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                  {usagePercentage}%
                                </span>
                              </div>
                              <div className="w-full bg-white/50 dark:bg-slate-700/50 rounded-full h-3">
                                <div
                                  className={`h-3 bg-gradient-to-r ${theme.gradient} rounded-full transition-all duration-1000`}
                                  style={{ width: `${usagePercentage}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-600 dark:text-slate-400">
                                  Использовано: {formatTokenAmount(plan.tokens_used)}
                                </span>
                                <span className="text-slate-600 dark:text-slate-400">
                                  Осталось: {formatTokenAmount(plan.tokens_remaining)}
                                </span>
                              </div>
                            </div>

                            {/* Статистика */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                                <Coins className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                                <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                  {formatTokenAmount(plan.token_amount)}
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">Всего токенов</div>
                              </div>
                              <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                                <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                  {formatTokenAmount(plan.tokens_used)}
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">Потрачено</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                    <p className="text-slate-600 dark:text-slate-400">Нет активных планов</p>
                  </div>
                )
              ) : (
                closedPlans.length > 0 ? (
                  closedPlans.map((plan) => {
                    const theme = getPlanTheme(plan.plan_name);

                    return (
                      <Card key={plan.id} className="border-0 bg-slate-50 dark:bg-slate-800/50 opacity-75">
                        <CardContent className="p-5">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-300 dark:bg-slate-600 rounded-2xl flex items-center justify-center">
                                  <Archive className="w-5 h-5 text-slate-500" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-slate-700 dark:text-slate-300">
                                    {plan.plan_name}
                                  </h3>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {formatDate(plan.start_date)} - {plan.end_date && formatDate(plan.end_date)}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary">
                                <Clock className="w-3 h-3 mr-1" />
                                Завершен
                              </Badge>
                            </div>

                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              Использовано: {formatTokenAmount(plan.tokens_used)} из {formatTokenAmount(plan.token_amount)} токенов
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Archive className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                    <p className="text-slate-600 dark:text-slate-400">Нет завершенных планов</p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
