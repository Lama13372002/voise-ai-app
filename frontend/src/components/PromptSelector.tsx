'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Lock, Plus, Trash2, Edit, Brain, Sparkles } from 'lucide-react';
import type { TelegramWebApp } from '@/types/telegram';
import { apiClient } from '@/lib/api-client';

interface PromptInfo {
  id: number;
  title: string;
  description: string;
  content: string;
  plan_required?: number;
  category: string;
  voice_gender: string;
  created_at?: string;
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
}

interface PromptSelectorProps {
  user: UserData | null;
  tg: TelegramWebApp | null;
  onPromptChange?: (promptId: number) => void;
}

interface PromptsData {
  userPlan: {
    plan_name: string;
    plan_level: number;
  };
  basePrompts: PromptInfo[];
  userPrompts: PromptInfo[];
  selectedPromptId: number | null;
  promptLimits: {
    current: number;
    max: number;
    canCreateMore: boolean;
  };
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'education': return '🎓';
    case 'health': return '💚';
    case 'fitness': return '💪';
    case 'business': return '💼';
    case 'cooking': return '👨‍🍳';
    case 'technology': return '💻';
    case 'general': return '🤖';
    default: return '💭';
  }
};

const getPlanColor = (planLevel: number): string => {
  switch (planLevel) {
    case 1: return 'bg-blue-500';
    case 2: return 'bg-purple-500';
    case 3: return 'bg-orange-500';
    default: return 'bg-gray-500';
  }
};

const getPlanName = (planLevel: number): string => {
  switch (planLevel) {
    case 1: return 'Базовый';
    case 2: return 'Премиум + Про';
    case 3: return 'Про';
    default: return 'Неизвестный';
  }
};

export default function PromptSelector({ user, tg, onPromptChange }: PromptSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<PromptsData | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPrompt, setNewPrompt] = useState({
    title: '',
    description: '',
    content: '',
    category: 'general',
    voice_gender: 'any'
  });

  const fetchPrompts = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Сначала получаем текущий план пользователя
      const planData = await apiClient.getCurrentUserPlan(user.id);

      if (!planData.success) {
        console.error('Error fetching user plan:', planData.error);
        return;
      }

      const result = await apiClient.getPrompts(user.id);

      if (result.success && result.data) {
        // Обновляем план пользователя с актуальными данными
        const currentPlanName = planData.data?.current_plan_name || 'Бесплатный план';
        const updatedData = {
          ...(result.data as PromptsData),
          userPlan: {
            plan_name: currentPlanName,
            plan_level: currentPlanName === 'Базовый' ? 1 :
                       currentPlanName === 'Премиум' ? 2 :
                       currentPlanName === 'Про' ? 3 : 1
          }
        };
        setPrompts(updatedData);
      } else {
        console.error('Error fetching prompts:', result.error);
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Обновляем промпты при изменении пользователя (включая смену плана)
  useEffect(() => {
    if (user?.id) {
      fetchPrompts();
    }
  }, [user?.id, user?.current_plan_name]); // Добавляем зависимость от плана

  // Дополнительно обновляем при открытии селектора
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchPrompts();
    }
  }, [isOpen]);

  const handleSelectPrompt = async (promptId: number) => {
    if (!user?.id) return;

    try {
      const result = await apiClient.selectPrompt({
        user_id: user.id,
        prompt_id: promptId
      });

      if (result.success) {
        setPrompts(prev => prev ? { ...prev, selectedPromptId: promptId } : null);
        onPromptChange?.(promptId);
        tg?.HapticFeedback.impactOccurred('light');
        tg?.showAlert('Промпт успешно выбран!');
      } else {
        tg?.showAlert(result.error || 'Ошибка выбора промпта');
      }
    } catch (error) {
      console.error('Error selecting prompt:', error);
      tg?.showAlert('Ошибка выбора промпта');
    }
  };

  const handleCreatePrompt = async () => {
    if (!user?.id || !newPrompt.title || !newPrompt.content) {
      tg?.showAlert('Заполните название и содержание промпта');
      return;
    }

    try {
      const result = await apiClient.createPrompt({
        user_id: user.id,
        title: newPrompt.title,
        description: newPrompt.description,
        content: newPrompt.content,
        category: newPrompt.category,
        voice_gender: newPrompt.voice_gender
      });

      if (result.success) {
        setNewPrompt({
          title: '',
          description: '',
          content: '',
          category: 'general',
          voice_gender: 'any'
        });
        setShowCreateForm(false);
        fetchPrompts();
        tg?.HapticFeedback.impactOccurred('medium');
        tg?.showAlert('Промпт успешно создан!');
      } else {
        tg?.showAlert(result.error || 'Ошибка создания промпта');
      }
    } catch (error) {
      console.error('Error creating prompt:', error);
      tg?.showAlert('Ошибка создания промпта');
    }
  };

  const handleDeletePrompt = async (promptId: number) => {
    if (!user?.id) return;

    try {
      const result = await apiClient.deletePrompt(user.id, promptId);

      if (result.success) {
        fetchPrompts();
        tg?.HapticFeedback.impactOccurred('light');
        tg?.showAlert('Промпт удален');
      } else {
        tg?.showAlert(result.error || 'Ошибка удаления промпта');
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
      tg?.showAlert('Ошибка удаления промпта');
    }
  };

  const currentPrompt = prompts ?
    [...prompts.basePrompts, ...prompts.userPrompts].find(p => p.id === prompts.selectedPromptId) ||
    prompts.basePrompts[0]
    : null;

  return (
    <div className="space-y-4">
      {/* Текущий выбранный промпт */}
      <Card className="border-0 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-xl">
                {currentPrompt ? getCategoryIcon(currentPrompt.category) : '🤖'}
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Активный промпт
                </div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {currentPrompt?.title || 'Дружелюбный помощник'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {currentPrompt?.description || 'Основной ИИ-ассистент'}
                </div>
              </div>
            </div>
            <Button
              onClick={() => setIsOpen(!isOpen)}
              variant="outline"
              size="sm"
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
            >
              <Brain className="w-4 h-4 mr-1" />
              {isOpen ? 'Закрыть' : 'Изменить'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Селектор промптов */}
      {isOpen && (
        <Card className="border-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Промпты для ИИ
              </CardTitle>
              {prompts && (
                <Badge variant="outline">
                  План: {prompts.userPlan.plan_name}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-slate-500">
                Загрузка промптов...
              </div>
            ) : prompts ? (
              <div>
                {/* Базовые промпты */}
                {prompts.basePrompts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span>Базовые промпты</span>
                      <Badge variant="outline" className="text-xs">
                        {prompts.basePrompts.length} доступно
                      </Badge>
                    </h3>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {prompts.basePrompts.map((prompt) => {
                        const isSelected = prompt.id === prompts.selectedPromptId;

                        return (
                          <div
                            key={prompt.id}
                            onClick={() => handleSelectPrompt(prompt.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer
                              bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600
                              hover:bg-slate-50 dark:hover:bg-slate-600
                              ${isSelected ? 'ring-2 ring-emerald-500 border-emerald-300' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="text-2xl">
                                  {getCategoryIcon(prompt.category)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                      {prompt.title}
                                    </span>
                                    {prompt.plan_required && prompt.plan_required > 1 && (
                                      <Badge
                                        variant="outline"
                                        className={`text-xs ${getPlanColor(prompt.plan_required)} text-white border-0`}
                                      >
                                        {prompt.plan_required === 2 ? 'Премиум + Про' : getPlanName(prompt.plan_required)}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-600 dark:text-slate-400">
                                    {prompt.description}
                                  </div>
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-emerald-500" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Пользовательские промпты */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span>Мои промпты</span>
                      <Badge variant="outline" className="text-xs">
                        {prompts.promptLimits.current}/{prompts.promptLimits.max === -1 ? '∞' : prompts.promptLimits.max}
                      </Badge>
                    </h3>

                    {prompts.promptLimits.canCreateMore && (
                      <Button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        size="sm"
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Создать
                      </Button>
                    )}
                  </div>

                  {/* Форма создания промпта */}
                  {showCreateForm && (
                    <Card className="border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20">
                      <CardContent className="p-4 space-y-3">
                        <input
                          type="text"
                          placeholder="Название промпта"
                          value={newPrompt.title}
                          onChange={(e) => setNewPrompt(prev => ({...prev, title: e.target.value}))}
                          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        />

                        <input
                          type="text"
                          placeholder="Краткое описание (необязательно)"
                          value={newPrompt.description}
                          onChange={(e) => setNewPrompt(prev => ({...prev, description: e.target.value}))}
                          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        />

                        <textarea
                          placeholder="Содержание промпта - детальные инструкции для ИИ"
                          value={newPrompt.content}
                          onChange={(e) => setNewPrompt(prev => ({...prev, content: e.target.value}))}
                          rows={4}
                          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 resize-none"
                        />

                        <div className="flex gap-2">
                          <select
                            value={newPrompt.category}
                            onChange={(e) => setNewPrompt(prev => ({...prev, category: e.target.value}))}
                            className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                          >
                            <option value="general">Общий</option>
                            <option value="education">Образование</option>
                            <option value="health">Здоровье</option>
                            <option value="business">Бизнес</option>
                            <option value="technology">Технологии</option>
                            <option value="cooking">Кулинария</option>
                          </select>

                          <select
                            value={newPrompt.voice_gender}
                            onChange={(e) => setNewPrompt(prev => ({...prev, voice_gender: e.target.value}))}
                            className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                          >
                            <option value="any">Любой голос</option>
                            <option value="male">Мужской голос</option>
                            <option value="female">Женский голос</option>
                          </select>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={handleCreatePrompt}
                            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                          >
                            Создать промпт
                          </Button>
                          <Button
                            onClick={() => setShowCreateForm(false)}
                            variant="outline"
                            className="px-4"
                          >
                            Отмена
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Список пользовательских промптов */}
                  {prompts.userPrompts.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {prompts.userPrompts.map((prompt) => {
                        const isSelected = prompt.id === prompts.selectedPromptId;

                        return (
                          <div
                            key={prompt.id}
                            className={`p-3 rounded-xl border transition-all
                              bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600
                              hover:bg-slate-50 dark:hover:bg-slate-600
                              ${isSelected ? 'ring-2 ring-emerald-500 border-emerald-300' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <div
                                onClick={() => handleSelectPrompt(prompt.id)}
                                className="flex items-center gap-3 flex-1 cursor-pointer"
                              >
                                <div className="text-2xl">
                                  {getCategoryIcon(prompt.category)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                      {prompt.title}
                                    </span>
                                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                                      Мой
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-slate-600 dark:text-slate-400">
                                    {prompt.description || 'Пользовательский промпт'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {isSelected && (
                                  <Check className="w-4 h-4 text-emerald-500" />
                                )}
                                <Button
                                  onClick={() => handleDeletePrompt(prompt.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : !showCreateForm && (
                    <div className="text-center py-6 text-slate-500">
                      <div className="text-4xl mb-2">💭</div>
                      <p className="text-sm">
                        {prompts.promptLimits.canCreateMore
                          ? 'У вас нет собственных промптов. Создайте первый!'
                          : `Создание промптов доступно начиная с Премиум плана (у вас ${prompts.userPlan.plan_name})`
                        }
                      </p>
                    </div>
                  )}
                </div>

                {/* Информация о планах */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600">
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span>Базовый план: 2 базовых промпта, создание недоступно</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded"></div>
                      <span>Премиум план: 7 базовых промптов, до 3 собственных</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span>Про план: 7 базовых промптов, неограниченно собственных</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                Ошибка загрузки промптов
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
