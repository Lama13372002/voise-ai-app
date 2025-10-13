'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit3,
  Trash2,
  Settings,
  Crown,
  Diamond,
  Coins,
  Zap,
  DollarSign,
  Users,
  BarChart3,
  Eye,
  EyeOff,
  Save,
  X
} from 'lucide-react';
import PlanEditModal from '@/components/admin/PlanEditModal';
import { apiClient, type Plan } from '@/lib/api-client';

export default function AdminPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await apiClient.getAllPlansForAdmin();
      if (response.success && response.data?.plans) {
        setPlans(response.data.plans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number, planName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить план "${planName}"?`)) {
      return;
    }

    try {
      const response = await apiClient.deletePlanAdmin(id);

      if (response.success) {
        await fetchPlans();
      } else {
        alert(`Ошибка при удалении плана: ${response.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Ошибка при удалении плана');
    }
  };

  const togglePlanStatus = async (plan: Plan) => {
    try {
      const response = await apiClient.updatePlanAdmin({
        plan_id: plan.id,
        is_active: !plan.is_active,
      });

      if (response.success) {
        await fetchPlans();
      } else {
        alert(`Ошибка при изменении статуса плана: ${response.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Error toggling plan status:', error);
      alert('Ошибка при изменении статуса плана');
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'базовый':
        return Coins;
      case 'премиум':
        return Crown;
      case 'про':
        return Diamond;
      default:
        return Zap;
    }
  };

  const getPlanTheme = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'базовый':
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl animate-pulse mb-4 flex items-center justify-center">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <p className="text-slate-600 dark:text-slate-400">Загрузка админ панели...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Заголовок админ панели */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  Админ панель
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Управление планами подписки
                </p>
              </div>
            </div>

            <Button
              onClick={handleCreate}
              size="lg"
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="w-5 h-5 mr-2" />
              Создать план
            </Button>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                      {plans.length}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Всего планов
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                      {plans.filter(p => p.is_active).length}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Активных
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                      ${Math.round(plans.reduce((sum, p) => sum + p.price, 0))}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Сумма цен
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                      {plans.reduce((sum, p) => sum + p.features.length, 0)}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Всего фич
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Список планов */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = getPlanIcon(plan.name);
            const theme = getPlanTheme(plan.name);

            return (
              <Card
                key={plan.id}
                className={`border-0 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl bg-gradient-to-br ${theme.bgGradient} ${
                  plan.is_active
                    ? 'shadow-lg'
                    : 'opacity-60 shadow-md'
                }`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 bg-gradient-to-r ${theme.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {plan.name}
                          <Badge
                            variant={plan.is_active ? "success" : "secondary"}
                            className="text-xs"
                          >
                            {plan.is_active ? 'Активен' : 'Неактивен'}
                          </Badge>
                        </CardTitle>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          ID: {plan.id}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Цена */}
                  <div className="text-center py-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                    <div className={`text-2xl font-bold ${theme.textColor}`}>
                      ${plan.price} {plan.currency}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {plan.token_amount?.toLocaleString() || 0} токенов
                    </div>
                  </div>

                  {/* Описание */}
                  {plan.description && (
                    <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {plan.description}
                      </p>
                    </div>
                  )}

                  {/* Возможности */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Возможности ({plan.features.length}):
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {plan.features.map((feature, index) => (
                        <div
                          key={index}
                          className="text-xs text-slate-600 dark:text-slate-400 p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg"
                        >
                          {index + 1}. {feature || 'Пустая возможность'}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleEdit(plan)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Изменить
                    </Button>

                    <Button
                      onClick={() => togglePlanStatus(plan)}
                      size="sm"
                      variant={plan.is_active ? "outline" : "default"}
                      className="px-3"
                    >
                      {plan.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>

                    <Button
                      onClick={() => handleDelete(plan.id, plan.name)}
                      size="sm"
                      variant="destructive"
                      className="px-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Дата создания */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                    Создан: {plan.created_at ? new Date(plan.created_at).toLocaleDateString('ru-RU') : 'Н/Д'}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Модальное окно редактирования */}
        <PlanEditModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          plan={editingPlan}
          onSave={fetchPlans}
        />
      </div>
    </div>
  );
}
