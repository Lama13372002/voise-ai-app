'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, DollarSign, Check } from 'lucide-react';

interface ModelSelectorProps {
  userId: number;
  onModelChange?: (model: string) => void;
  disabled?: boolean;
}

type ModelType = 'gpt-realtime' | 'gpt-realtime-mini';

interface ModelInfo {
  id: ModelType;
  name: string;
  description: string;
  features: string[];
  icon: typeof Zap;
  badgeColor: string;
  cardColor: string;
}

const models: ModelInfo[] = [
  {
    id: 'gpt-realtime',
    name: 'GPT Realtime',
    description: 'Премиум качество, максимальная точность произношения',
    features: [
      'Высочайшая точность',
      'Идеальное произношение',
      'Минимум ошибок',
      'Выше стоимость'
    ],
    icon: Zap,
    badgeColor: 'bg-purple-500 hover:bg-purple-600',
    cardColor: 'border-purple-200 dark:border-purple-800'
  },
  {
    id: 'gpt-realtime-mini',
    name: 'GPT Realtime Mini',
    description: 'Оптимальный баланс цены и качества',
    features: [
      'Хорошая точность',
      'Экономичная модель',
      'Быстрые ответы',
      'Возможны редкие ошибки'
    ],
    icon: DollarSign,
    badgeColor: 'bg-green-500 hover:bg-green-600',
    cardColor: 'border-green-200 dark:border-green-800'
  }
];

export default function ModelSelector({ userId, onModelChange, disabled }: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState<ModelType>('gpt-realtime');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSelectedModel = async () => {
      try {
        const response = await fetch(`/api/users?user_id=${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.user?.selected_model) {
            setSelectedModel(data.user.selected_model as ModelType);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки выбранной модели:', error);
      }
    };

    if (userId) {
      fetchSelectedModel();
    }
  }, [userId]);

  const handleModelSelect = async (modelId: ModelType) => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          selected_model: modelId
        })
      });

      if (response.ok) {
        setSelectedModel(modelId);
        onModelChange?.(modelId);
      }
    } catch (error) {
      console.error('Ошибка сохранения модели:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Выберите модель ИИ
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {models.map((model) => {
          const Icon = model.icon;
          const isSelected = selectedModel === model.id;

          return (
            <Card
              key={model.id}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? `${model.cardColor} bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-md`
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => handleModelSelect(model.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${model.badgeColor}`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                        {model.name}
                      </h4>
                    </div>
                  </div>
                  {isSelected && (
                    <Badge className="bg-blue-500 hover:bg-blue-600">
                      <Check className="w-3 h-3 mr-1" />
                      Выбрано
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                  {model.description}
                </p>

                <div className="space-y-1">
                  {model.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-slate-400" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
