'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Save,
  Plus,
  Trash2,
  Crown,
  Diamond,
  Coins,
  Zap,
  Check,
  AlertCircle
} from 'lucide-react';

interface SubscriptionPlan {
  id: number;
  name: string;
  description?: string;
  price: string;
  currency: string;
  token_amount: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

interface PlanEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan | null;
  onSave: () => void;
}

export default function PlanEditModal({ isOpen, onClose, plan, onSave }: PlanEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    token_amount: 1000,
    features: [''],
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        description: plan.description || '',
        price: plan.price,
        currency: plan.currency,
        token_amount: plan.token_amount,
        features: plan.features.length > 0 ? plan.features : [''],
        is_active: plan.is_active
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        currency: 'USD',
        token_amount: 1000,
        features: [''],
        is_active: true
      });
    }
    setErrors({});
  }, [plan]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Название плана обязательно';
    }

    if (!formData.price || parseFloat(formData.price) < 0) {
      newErrors.price = 'Цена должна быть больше или равна 0';
    }

    if (!formData.token_amount || formData.token_amount <= 0) {
      newErrors.token_amount = 'Количество токенов должно быть больше 0';
    }

    // Фильтруем пустые возможности
    const validFeatures = formData.features.filter(f => f.trim());
    if (validFeatures.length === 0) {
      newErrors.features = 'Должна быть хотя бы одна возможность';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      // Фильтруем пустые возможности перед отправкой
      const validFeatures = formData.features.filter(f => f.trim());

      const bodyData = {
        ...formData,
        features: validFeatures,
        price: parseFloat(formData.price),
        ...(plan && { id: plan.id })
      };

      const response = await fetch('/api/admin/plans', {
        method: plan ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
      });

      if (response.ok) {
        onSave();
        onClose();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Ошибка при сохранении плана');
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('Ошибка при сохранении плана');
    } finally {
      setSaving(false);
    }
  };

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f)
    }));
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

  if (!isOpen) return null;

  const Icon = getPlanIcon(formData.name);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden border-0 shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <CardTitle className="text-xl">
                {plan ? 'Редактировать план' : 'Создать новый план'}
              </CardTitle>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Левая колонка - Основная информация */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  Основная информация
                </h3>

                {/* Название */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Название плана *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      errors.name ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-slate-300 dark:border-slate-600'
                    }`}
                    placeholder="Например: Премиум"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Описание */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    rows={3}
                    placeholder="Краткое описание плана..."
                  />
                </div>

                {/* Цена и валюта */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Цена *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        errors.price ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-slate-300 dark:border-slate-600'
                      }`}
                      placeholder="0.00"
                    />
                    {errors.price && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.price}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Валюта
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="RUB">RUB</option>
                    </select>
                  </div>
                </div>

                {/* Количество токенов */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Количество токенов *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.token_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, token_amount: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      errors.token_amount ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-slate-300 dark:border-slate-600'
                    }`}
                    placeholder="1000"
                  />
                  {errors.token_amount && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.token_amount}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Рекомендуемо: 1000+ токенов
                  </p>
                </div>

                {/* Статус */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Статус плана
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={() => setFormData(prev => ({ ...prev, is_active: true }))}
                        className="w-4 h-4 text-green-500"
                      />
                      <Badge variant="success" className="text-xs">
                        Активен
                      </Badge>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="is_active"
                        checked={!formData.is_active}
                        onChange={() => setFormData(prev => ({ ...prev, is_active: false }))}
                        className="w-4 h-4 text-gray-500"
                      />
                      <Badge variant="secondary" className="text-xs">
                        Неактивен
                      </Badge>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Правая колонка - Возможности */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-500" />
                    Возможности плана ({formData.features.filter(f => f.trim()).length})
                  </h3>
                  <Button
                    onClick={addFeature}
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Добавить
                  </Button>
                </div>

                {errors.features && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.features}
                  </p>
                )}

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => updateFeature(index, e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder={`Возможность ${index + 1}...`}
                        />
                      </div>
                      {formData.features.length > 1 && (
                        <Button
                          onClick={() => removeFeature(index)}
                          size="sm"
                          variant="destructive"
                          className="px-3 py-3"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Предпросмотр возможностей */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Предпросмотр возможностей:
                  </h4>
                  <div className="space-y-2">
                    {formData.features.filter(f => f.trim()).map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {feature}
                        </span>
                      </div>
                    ))}
                    {formData.features.filter(f => f.trim()).length === 0 && (
                      <p className="text-sm text-slate-500 italic">
                        Добавьте возможности для предпросмотра
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Футер с кнопками */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-800">
          <div className="flex justify-end gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={saving}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {plan ? 'Сохранить изменения' : 'Создать план'}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
