'use client';

import React from 'react';
import { X, Shield, Eye, Lock, AlertTriangle, Gavel, Database, Users, Globe, Mail } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  // Предотвращаем скролл заднего фона когда модальное окно открыто
  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sections = [
    {
      title: "1. Общие положения",
      icon: Shield,
      gradient: "from-blue-500 to-indigo-500",
      content: (
        <div className="space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Настоящая Политика конфиденциальности определяет порядок обработки персональных данных пользователей приложения "Голосовой ИИ" (далее - "Приложение").
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Используя Приложение, вы соглашаетесь с условиями данной Политики и обработкой ваших персональных данных в соответствии с описанными принципами.
          </p>
          <div className="bg-blue-50/80 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200/50 dark:border-blue-700/30">
            <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
              Дата последнего обновления: 03 октября 2024 года
            </p>
          </div>
        </div>
      )
    },
    {
      title: "2. Какие данные мы собираем",
      icon: Database,
      gradient: "from-green-500 to-emerald-500",
      content: (
        <div className="space-y-3">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Данные Telegram:</h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 ml-4">
              <li>• Уникальный ID пользователя Telegram</li>
              <li>• Имя и фамилия</li>
              <li>• Username (если указан)</li>
              <li>• Статус Premium подписки</li>
              <li>• Языковые настройки</li>
            </ul>
          </div>

          <div className="bg-green-50/80 dark:bg-green-900/20 rounded-lg p-3 border border-green-200/50 dark:border-green-700/30">
            <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">Голосовые данные:</h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              <strong>Мы НЕ собираем голосовые данные.</strong> Вся обработка речи происходит напрямую между вашим устройством и внешними ИИ-сервисами без нашего участия.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Техническая информация:</h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 ml-4">
              <li>• Время и дата использования</li>
              <li>• Количество запросов к ИИ</li>
              <li>• Настройки приложения</li>
              <li>• Информация об ошибках</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "3. Как мы используем данные",
      icon: Eye,
      gradient: "from-purple-500 to-violet-500",
      content: (
        <div className="space-y-3">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Основные цели:</h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 ml-4">
              <li>• Предоставление услуг ИИ</li>
              <li>• Обработка и генерация ответов</li>
              <li>• Персонализация опыта использования</li>
              <li>• Техническая поддержка пользователей</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Аналитика и улучшения:</h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 ml-4">
              <li>• Анализ использования функций</li>
              <li>• Оптимизация производительности</li>
              <li>• Разработка новых функций</li>
              <li>• Улучшение пользовательского интерфейса</li>
            </ul>
          </div>

          <div className="bg-purple-50/80 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200/50 dark:border-purple-700/30">
            <p className="text-xs text-purple-800 dark:text-purple-200">
              <strong>Важно:</strong> Мы никогда не используем ваши данные для рекламы или продажи третьим лицам.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "4. Голосовые данные и приватность",
      icon: Lock,
      gradient: "from-green-500 to-emerald-500",
      content: (
        <div className="space-y-3">
          <div className="bg-green-50/80 dark:bg-green-900/20 rounded-lg p-3 border border-green-200/50 dark:border-green-700/30">
            <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-2">
              Максимальная приватность
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              Ваши голосовые данные недоступны нам и не сохраняются в нашей системе.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Как это работает:</h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 ml-4">
              <li>• Прямая передача с вашего устройства к ИИ-сервису</li>
              <li>• Наши серверы не имеют доступа к аудиоданным</li>
              <li>• Обработка происходит на стороне внешних ИИ-провайдеров</li>
              <li>• Мы получаем только финальный текстовый ответ</li>
              <li>• Полная конфиденциальность ваших разговоров</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Что мы НЕ делаем:</h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 ml-4">
              <li>• Не записываем ваш голос</li>
              <li>• Не сохраняем аудиофайлы</li>
              <li>• Не анализируем голосовые данные</li>
              <li>• Не имеем доступа к содержанию разговоров</li>
            </ul>
          </div>

          <div className="bg-blue-50/80 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200/50 dark:border-blue-700/30">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Важно:</strong> Политики обработки голосовых данных регулируются непосредственно ИИ-провайдерами (OpenAI, Google и др.).
            </p>
          </div>
        </div>
      )
    },
    {
      title: "5. Безопасность и защита",
      icon: Shield,
      gradient: "from-cyan-500 to-blue-500",
      content: (
        <div className="space-y-3">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Технические меры:</h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 ml-4">
              <li>• Шифрование данных AES-256</li>
              <li>• Многофакторная аутентификация</li>
              <li>• Регулярные аудиты безопасности</li>
              <li>• Мониторинг несанкционированного доступа</li>
              <li>• Резервное копирование с шифрованием</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Организационные меры:</h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 ml-4">
              <li>• Ограниченный доступ к данным</li>
              <li>• Обучение персонала безопасности</li>
              <li>• Политики информационной безопасности</li>
              <li>• Процедуры реагирования на инциденты</li>
            </ul>
          </div>

          <div className="bg-cyan-50/80 dark:bg-cyan-900/20 rounded-lg p-3 border border-cyan-200/50 dark:border-cyan-700/30">
            <p className="text-xs text-cyan-800 dark:text-cyan-200">
              При обнаружении нарушения безопасности мы уведомим затронутых пользователей в течение 72 часов.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "6. Ваши права",
      icon: Users,
      gradient: "from-orange-500 to-red-500",
      content: (
        <div className="space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            В соответствии с законодательством о защите персональных данных, вы имеете следующие права:
          </p>

          <div className="space-y-2">
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-2 ml-4">
              <li>• <strong>Доступ:</strong> Получить информацию о ваших данных</li>
              <li>• <strong>Исправление:</strong> Изменить неточные данные</li>
              <li>• <strong>Удаление:</strong> Запросить удаление ваших данных</li>
              <li>• <strong>Ограничение:</strong> Ограничить обработку данных</li>
              <li>• <strong>Переносимость:</strong> Получить данные в структурированном формате</li>
              <li>• <strong>Возражение:</strong> Возразить против обработки</li>
              <li>• <strong>Отзыв согласия:</strong> Отозвать согласие в любое время</li>
            </ul>
          </div>

          <div className="bg-orange-50/80 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200/50 dark:border-orange-700/30">
            <p className="text-xs text-orange-800 dark:text-orange-200">
              Для реализации ваших прав свяжитесь с нами через настройки приложения или напишите на почту поддержки.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "7. Правила использования и блокировка",
      icon: AlertTriangle,
      gradient: "from-yellow-500 to-orange-500",
      content: (
        <div className="space-y-3">
          <div className="bg-yellow-50/80 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200/50 dark:border-yellow-700/30">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
              Важные ограничения
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              Нарушение правил может привести к ограничению или блокировке доступа к сервису.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Запрещается:</h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 ml-4">
              <li>• Использование для незаконных целей</li>
              <li>• Создание контента, нарушающего права других</li>
              <li>• Попытки взлома или обхода защиты</li>
              <li>• Спам и автоматизированные запросы</li>
              <li>• Распространение вредоносного контента</li>
              <li>• Нарушение авторских прав</li>
              <li>• Дискриминация и разжигание вражды</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Меры воздействия:</h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 ml-4">
              <li>• Предупреждение пользователя</li>
              <li>• Временная блокировка (от 1 часа до 30 дней)</li>
              <li>• Постоянная блокировка аккаунта</li>
              <li>• Удаление всех данных пользователя</li>
              <li>• Передача информации в правоохранительные органы</li>
            </ul>
          </div>

          <div className="bg-red-50/80 dark:bg-red-900/20 rounded-lg p-3 border border-red-200/50 dark:border-red-700/30">
            <p className="text-xs text-red-800 dark:text-red-200">
              <strong>Обратите внимание:</strong> При серьезных нарушениях блокировка может быть применена без предупреждения.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "8. Передача данных третьим лицам",
      icon: Globe,
      gradient: "from-indigo-500 to-purple-500",
      content: (
        <div className="space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Мы можем передавать ваши данные третьим лицам только в следующих случаях:
          </p>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Технические партнеры:</h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 ml-4">
              <li>• Поставщики ИИ-сервисов (OpenAI, Google, и др.)</li>
              <li>• Хостинг-провайдеры для хранения данных</li>
              <li>• Сервисы аналитики (анонимизированные данные)</li>
              <li>• Платежные системы (только для транзакций)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Правовые требования:</h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 ml-4">
              <li>• По запросу правоохранительных органов</li>
              <li>• При судебных разбирательствах</li>
              <li>• Для защиты наших прав и безопасности</li>
              <li>• При подозрении в мошенничестве</li>
            </ul>
          </div>

          <div className="bg-indigo-50/80 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-200/50 dark:border-indigo-700/30">
            <p className="text-xs text-indigo-800 dark:text-indigo-200">
              Все партнеры подписывают соглашения о конфиденциальности и соблюдают наши стандарты защиты данных.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "9. Изменения политики",
      icon: Gavel,
      gradient: "from-slate-500 to-slate-600",
      content: (
        <div className="space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Мы оставляем за собой право изменять данную Политику конфиденциальности для соответствия изменениям в законодательстве или развитии сервиса.
          </p>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Процедура уведомления:</h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 ml-4">
              <li>• Уведомление в приложении за 30 дней</li>
              <li>• Публикация обновленной версии</li>
              <li>• Отправка сообщения активным пользователям</li>
              <li>• Возможность ознакомления с изменениями</li>
            </ul>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-800/20 rounded-lg p-3 border border-slate-200/50 dark:border-slate-600/30">
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Продолжение использования приложения после внесения изменений означает согласие с новой версией Политики.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "10. Контактная информация",
      icon: Mail,
      gradient: "from-green-500 to-teal-500",
      content: (
        <div className="space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            По вопросам, связанным с обработкой персональных данных и данной Политикой конфиденциальности, вы можете обратиться к нам:
          </p>

          <div className="bg-green-50/80 dark:bg-green-900/20 rounded-lg p-4 border border-green-200/50 dark:border-green-700/30">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                Служба поддержки:
              </p>
              <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
                <p>📧 E-mail: privacy@voiceai.app</p>
                <p>🤖 Telegram: @VoiceAI_Support</p>
                <p>⏰ Время ответа: в течение 24 часов</p>
                <p>🌐 Язык поддержки: русский, английский</p>
              </div>
            </div>
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Настоящая Политика конфиденциальности вступила в силу 03 октября 2024 года
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute top-0 left-0 w-full h-full bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      />

      {/* Modal */}
      <Card className="relative w-full max-w-2xl max-h-[90vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-0 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />

        <CardHeader className="relative border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  Политика конфиденциальности
                </CardTitle>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Версия 1.0 от 03.10.2024
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-8 h-8 p-0 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="relative p-0 overflow-y-auto max-h-[75vh]">
          <div className="p-6 space-y-6">
            {sections.map((section, index) => {
              const SectionIcon = section.icon;

              return (
                <div key={index} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 bg-gradient-to-r ${section.gradient} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <SectionIcon className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                      {section.title}
                    </h3>
                  </div>

                  <div className="ml-11">
                    {section.content}
                  </div>

                  {index < sections.length - 1 && (
                    <div className="border-b border-slate-200/30 dark:border-slate-700/30 mt-6" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
