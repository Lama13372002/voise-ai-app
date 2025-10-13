'use client';

import React from 'react';
import { X, HelpCircle, MessageSquare, Settings, Zap, Shield, Heart } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'help' | 'faq' | 'about';
}

const HelpContent = () => (
  <div className="space-y-6">
    <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-700/30">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-blue-800 dark:text-blue-200">Быстрый старт</h3>
      </div>
      <p className="text-sm text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
        Нажмите на кнопку микрофона и начните говорить. ИИ будет слушать вас и отвечать голосом в реальном времени.
      </p>
    </div>

    <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 border border-green-200/50 dark:border-green-700/30">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-green-800 dark:text-green-200">Голосовое общение</h3>
      </div>
      <ul className="space-y-2 text-sm text-green-700/80 dark:text-green-300/80">
        <li>• Говорите четко и не слишком быстро</li>
        <li>• Подождите завершения ответа ИИ</li>
        <li>• Используйте тихое место для лучшего качества</li>
      </ul>
    </div>

    <div className="bg-gradient-to-br from-purple-50/80 to-violet-50/80 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl p-4 border border-purple-200/50 dark:border-purple-700/30">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl flex items-center justify-center">
          <Settings className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-purple-800 dark:text-purple-200">Настройки</h3>
      </div>
      <p className="text-sm text-purple-700/80 dark:text-purple-300/80 leading-relaxed">
        В разделе настроек вы можете изменить тему, язык и другие параметры приложения.
      </p>
    </div>
  </div>
);

const FAQContent = () => (
  <div className="space-y-4">
    {[
      {
        question: "Как начать пользоваться приложением?",
        answer: "Просто нажмите на кнопку микрофона и начните говорить. ИИ автоматически распознает вашу речь и ответит голосом.",
        gradient: "from-blue-500 to-indigo-500"
      },
      {
        question: "Почему ИИ меня не слышит?",
        answer: "Убедитесь, что вы разрешили доступ к микрофону в браузере. Также проверьте ваше интернет соединение.",
        gradient: "from-red-500 to-pink-500"
      },
      {
        question: "Можно ли использовать приложение офлайн?",
        answer: "Нет, для работы ИИ требуется подключение к интернету. Голосовое распознавание и синтез речи происходят на серверах.",
        gradient: "from-orange-500 to-red-500"
      },
      {
        question: "Как работают токены?",
        answer: "Токены списываются за каждое обращение к ИИ. Токены можно получить за покупку плана.",
        gradient: "from-green-500 to-emerald-500"
      },
      {
        question: "Безопасны ли мои данные?",
        answer: "Мы серьезно относимся к безопасности. Голосовые данные передаются в зашифрованном виде и не сохраняются на серверах.",
        gradient: "from-purple-500 to-violet-500"
      }
    ].map((faq, index) => (
      <div key={index} className="bg-gradient-to-br from-slate-50/50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-700/50 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-600/30">
        <div className="flex items-start gap-3">
          <div className={`w-6 h-6 bg-gradient-to-r ${faq.gradient} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
            <span className="text-white text-xs font-bold">{index + 1}</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-sm">
              {faq.question}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {faq.answer}
            </p>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const AboutContent = () => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
        <HelpCircle className="w-10 h-10 text-white" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Голосовой ИИ</h3>
      <div className="flex items-center justify-center gap-2 mb-4">
        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700">
          Версия 1.0.0
        </Badge>
        <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700">
          Beta
        </Badge>
      </div>
    </div>

    <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-700/30">
      <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
        <Shield className="w-4 h-4" />
        О приложении
      </h4>
      <p className="text-sm text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
        Современное приложение для голосового общения с искусственным интеллектом.
        Создано для улучшения вашего опыта взаимодействия с ИИ через естественную речь.
      </p>
    </div>

    <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 border border-green-200/50 dark:border-green-700/30">
      <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
        <Heart className="w-4 h-4" />
        Команда разработки
      </h4>
      <p className="text-sm text-green-700/80 dark:text-green-300/80 leading-relaxed">
        Приложение разработано с любовью к инновациям и стремлением сделать ИИ более доступным для всех.
      </p>
    </div>

    <div className="text-center pt-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        © 2025 Голосовой ИИ. Все права защищены.
      </p>
    </div>
  </div>
);

export default function Modal({ isOpen, onClose, title, type }: ModalProps) {
  // Предотвращаем скролл заднего фона когда модальное окно открыто
  React.useEffect(() => {
    if (isOpen) {
      // Сохраняем текущий overflow и устанавливаем hidden
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Восстанавливаем overflow при закрытии модального окна
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const renderContent = () => {
    switch (type) {
      case 'help':
        return <HelpContent />;
      case 'faq':
        return <FAQContent />;
      case 'about':
        return <AboutContent />;
      default:
        return null;
    }
  };

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
      <Card className="relative w-full max-w-md max-h-[85vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-0 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />

        <CardHeader className="relative border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-700/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {title}
            </CardTitle>
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

        <CardContent className="relative p-6 overflow-y-auto max-h-[65vh]">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
