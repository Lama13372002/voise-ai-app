'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Check, Zap, Star, Sparkles, Clock, Headphones, BarChart3, Infinity, Diamond, Rocket, Coins, MessageCircle } from 'lucide-react';
import type { TelegramWebApp } from '@/types/telegram';
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
}

interface SubscriptionPlan {
  id: number;
  name: string;
  description?: string;
  price: number;
  currency: string;
  token_amount: number; // Количество токенов в плане
  features: string[];
  is_active: boolean;
}

interface PlansPageProps {
  user: UserData | null;
  tg: TelegramWebApp | null;
  onUserUpdate?: () => void;
}

export default function PlansPage({ user, tg, onUserUpdate }: PlansPageProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenBalance, setTokenBalance] = useState<number>(0);

  const fetchPlans = async () => {
    try {
      const result = await apiClient.getPlans();
      if (result.success && (result as any).plans) {
        setPlans((result as any).plans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenBalance = useCallback(async () => {
    if (!user?.id) return;

    try {
      const data = await apiClient.getTokenBalance(user.id);

      if (data.success && data.data) {
        setTokenBalance(data.data.token_balance);
      }
    } catch (error) {
      console.error('Error fetching token balance:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPlans();
    if (user?.id) {
      fetchTokenBalance();
    }
  }, [user?.id, fetchTokenBalance]);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    tg?.HapticFeedback.impactOccurred('medium');

    if (plan.price === 0) {
      // Для бесплатного плана не делаем ничего
      tg?.showAlert('Вы уже используете бесплатный план');
      return;
    }

    // В реальном приложении здесь будет интеграция с платежной системой
    if (tg?.showPopup) {
      tg.showPopup({
        title: 'Оформление подписки',
        message: `Вы выбрали план "${plan.name}" за ${plan.price} ${plan.currency}. Вы получите ${formatTokenAmount(plan.token_amount)} токенов. Функция оплаты будет добавлена в следующем обновлении.`,
        buttons: [
          { text: 'Отмена', type: 'cancel' },
          { text: 'Подтвердить', type: 'ok' }
        ]
      }, (buttonId) => {
        // В Telegram WebApp API, когда пользователь нажимает кнопку "ok",
        // buttonId может быть пустой строкой или undefined
        if (buttonId === 'ok' || buttonId === '' || buttonId === undefined || buttonId === null) {
          // Симуляция успешной покупки - добавляем токены
          simulatePurchase(plan);
        }
      });
    }
  };

  const simulatePurchase = async (plan: SubscriptionPlan) => {
    if (!user?.id) return;

    try {
      // Создаем подписку для пользователя
      const subscriptionResult = await apiClient.createSubscription({
        user_id: user.id,
        plan_id: plan.id,
        payment_id: `simulate_${Date.now()}` // Симуляция ID платежа
      });

      if (subscriptionResult.success) {
        // Обновляем баланс токенов локально
        setTokenBalance((subscriptionResult as any).new_token_balance);

        tg?.showAlert(`Успешно! План "${plan.name}" активирован. Добавлено ${formatTokenAmount(plan.token_amount)} токенов. Новый баланс: ${formatTokenAmount((subscriptionResult as any).new_token_balance)}`);

        // Обновляем данные пользователя для синхронизации с базой данных
        if (onUserUpdate) {
          onUserUpdate();
        }

        // Обновляем локальные планы
        setTimeout(() => {
          fetchPlans();
          fetchTokenBalance();
        }, 1000);
      } else {
        // Проверяем, есть ли информация о существующей подписке
        if ((subscriptionResult as any).existing_subscription) {
          const existingSub = (subscriptionResult as any).existing_subscription;
          tg?.showAlert(`У вас уже есть активная подписка "${existingSub.plan_name}" с ${formatTokenAmount(existingSub.tokens_remaining)} неиспользованными токенами. Сначала используйте текущую подписку.`);
        } else {
          tg?.showAlert(`Ошибка при создании подписки: ${subscriptionResult.error || 'Неизвестная ошибка'}`);
        }
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      tg?.showAlert('Ошибка при обработке покупки');
    }
  };

  const formatTokenAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toLocaleString();
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'базовый':
      case 'стартер':
        return Coins;
      case 'премиум':
        return Crown;
      case 'про':
      case 'безлимит':
        return Diamond;
      default:
        return Zap;
    }
  };

  const getPlanTheme = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'базовый':
      case 'стартер':
        return {
          gradient: 'from-blue-500 to-indigo-500',
          bgGradient: 'from-blue-50/50 via-indigo-50/50 to-blue-50/50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-blue-900/20',
          textColor: 'text-blue-600 dark:text-blue-400',
          borderColor: 'border-blue-200/50 dark:border-blue-700/50'
        };
      case 'премиум':
        return {
          gradient: 'from-purple-500 to-pink-500',
          bgGradient: 'from-purple-50/50 via-pink-50/50 to-purple-50/50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-purple-900/20',
          textColor: 'text-purple-600 dark:text-purple-400',
          borderColor: 'border-purple-200/50 dark:border-purple-700/50'
        };
      case 'про':
      case 'безлимит':
        return {
          gradient: 'from-orange-500 via-red-500 to-pink-500',
          bgGradient: 'from-orange-50/50 via-red-50/50 to-pink-50/50 dark:from-orange-900/20 dark:via-red-900/20 dark:to-pink-900/20',
          textColor: 'text-orange-600 dark:text-orange-400',
          borderColor: 'border-orange-200/50 dark:border-orange-700/50'
        };
      default:
        return {
          gradient: 'from-slate-500 to-slate-600',
          bgGradient: 'from-slate-50/50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-700/50',
          textColor: 'text-slate-600 dark:text-slate-400',
          borderColor: 'border-slate-200/50 dark:border-slate-700/50'
        };
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-6 max-w-md mx-auto">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-400 to-pink-500 rounded-3xl animate-pulse mb-4 flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">Загрузка планов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">


      {/* Заголовок */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Планы токенов
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Выберите план с токенами для общения с ИИ
        </p>
      </div>

      {/* Текущий баланс токенов */}
      <Card className="border-0 bg-gradient-to-br from-emerald-50/50 via-teal-50/50 to-cyan-50/50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl">
              <Coins className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-200 text-lg">
                Текущий баланс
              </h3>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatTokenAmount(tokenBalance)} токенов
              </p>
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
        </CardContent>
      </Card>

      {/* Текущая подписка */}
      {user?.has_active_subscription && (
        <Card className="border-2 border-yellow-300/50 dark:border-yellow-600/50 bg-gradient-to-br from-yellow-50/80 via-orange-50/80 to-yellow-50/80 dark:from-yellow-900/30 dark:via-orange-900/30 dark:to-yellow-900/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-orange-400/10 pointer-events-none" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-yellow-800 dark:text-yellow-200 text-lg">
                  Активная подписка
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {user.current_plan_name} • До 15 января 2025
                </p>
              </div>
              <Badge variant="success" className="shadow-md">
                <Star className="w-3 h-3 mr-1" />
                Активна
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Планы токенов */}
      <div className="space-y-4">
        {plans.map((plan) => {
          const Icon = getPlanIcon(plan.name);
          const theme = getPlanTheme(plan.name);
          const isCurrentPlan = user?.current_plan_name === plan.name;
          const isFree = plan.price === 0;
          const isPopular = plan.name.toLowerCase() === 'премиум';
          const isPro = plan.name.toLowerCase().includes('про') || plan.name.toLowerCase().includes('безлимит');

          return (
            <Card
              key={plan.id}
              className={`border-0 ${theme.borderColor} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl relative overflow-hidden ${
                isCurrentPlan
                  ? 'ring-2 ring-yellow-400 dark:ring-yellow-500 shadow-xl'
                  : isPro
                  ? 'ring-2 ring-gradient-to-r from-orange-400 to-pink-400 shadow-xl'
                  : isPopular
                  ? 'ring-2 ring-purple-400 dark:ring-purple-500 shadow-lg'
                  : 'shadow-md'
              } bg-gradient-to-br ${theme.bgGradient}`}
            >
              {/* Popular/Best badge */}
              {(isPopular || isPro) && !isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge
                    variant={isPro ? "gradient" : "purple"}
                    className="shadow-lg font-bold px-4 py-1"
                  >
                    {isPro ? (
                      <><Rocket className="w-3 h-3 mr-1" /> Лучший выбор</>
                    ) : (
                      <><Star className="w-3 h-3 mr-1" /> Популярный</>
                    )}
                  </Badge>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />

              <CardHeader className="pb-4 relative pt-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 bg-gradient-to-r ${theme.gradient} rounded-2xl flex items-center justify-center shadow-xl`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {plan.name}
                        {isPro && <Diamond className="w-5 h-5 text-orange-500" />}
                      </CardTitle>
                      {plan.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {plan.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {isCurrentPlan && (
                    <Badge variant="warning" className="font-bold">
                      <Check className="w-3 h-3 mr-1" />
                      Активен
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Цена и токены */}
                <div className="text-center py-4">
                  {isFree ? (
                    <div className="space-y-2">
                      <div className={`text-3xl font-bold ${theme.textColor}`}>
                        Бесплатно
                      </div>
                      <div className="text-lg text-slate-600 dark:text-slate-400">
                        {formatTokenAmount(plan.token_amount)} токенов
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-center">
                        <span className={`text-4xl font-bold ${theme.textColor}`}>
                          ${plan.price}
                        </span>
                        {isPro && (
                          <div className="text-xs text-orange-500 font-medium mt-1">-50% скидка</div>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Coins className="w-5 h-5 text-slate-500" />
                        <span className="text-xl font-bold text-slate-700 dark:text-slate-300">
                          {formatTokenAmount(plan.token_amount)} токенов
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Возможности */}
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`w-5 h-5 bg-gradient-to-r ${theme.gradient} rounded-full flex items-center justify-center mt-0.5 flex-shrink-0`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Кнопка покупки */}
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrentPlan}
                  className={`w-full h-14 text-base font-bold transition-all duration-300 ${
                    isCurrentPlan
                      ? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed text-slate-500'
                      : isFree
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg hover:shadow-xl'
                      : isPro
                      ? `bg-gradient-to-r ${theme.gradient} hover:shadow-2xl hover:scale-105 text-white shadow-xl`
                      : `bg-gradient-to-r ${theme.gradient} hover:shadow-xl text-white shadow-lg`
                  }`}
                  size="lg"
                >
                  {isCurrentPlan ? (
                    <><Check className="w-5 h-5 mr-2" /> Активен</>
                  ) : isFree ? (
                    'Текущий план'
                  ) : (
                    <><Diamond className="w-4 h-4 mr-2" /> <Coins className="w-4 h-4 mr-2" /> Купить токены</>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Дополнительная информация о токенах */}
      <Card className="border-0 bg-gradient-to-br from-slate-50/50 to-blue-50/50 dark:from-slate-800/50 dark:to-blue-900/20">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                Как работают токены?
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                <MessageCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  Точная оплата только за использованные токены
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                <Zap className="w-5 h-5 text-purple-500 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  Токены не сгорают - используйте когда удобно
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                <BarChart3 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  Прозрачный подсчет входящих и исходящих токенов
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
