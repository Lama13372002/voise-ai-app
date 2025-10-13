/**
 * Мок Telegram WebApp SDK для тестирования в браузере
 * Используется только для разработки, когда приложение запускается вне Telegram
 */

export interface MockTelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export const createMockTelegramWebApp = (mockUser?: MockTelegramUser) => {
  // Дефолтный тестовый пользователь
  const defaultUser: MockTelegramUser = {
    id: 123456789,
    first_name: 'Тестовый',
    last_name: 'Пользователь',
    username: 'test_user',
    language_code: 'ru',
  };

  const user = mockUser || defaultUser;

  const mockWebApp = {
    initData: '',
    initDataUnsafe: {
      user: user,
    },
    version: '7.0',
    platform: 'web',
    colorScheme: (localStorage.getItem('tma-dark-mode') === 'true' ? 'dark' : 'light') as 'light' | 'dark',
    themeParams: {
      bg_color: localStorage.getItem('tma-dark-mode') === 'true' ? '#0a0a0a' : '#ffffff',
      text_color: localStorage.getItem('tma-dark-mode') === 'true' ? '#ffffff' : '#000000',
      hint_color: '#999999',
      link_color: '#2481cc',
      button_color: '#2481cc',
      button_text_color: '#ffffff',
    },
    isExpanded: true,
    viewportHeight: window.innerHeight,
    viewportStableHeight: window.innerHeight,
    headerColor: '#ffffff',
    backgroundColor: '#ffffff',
    MainButton: {
      text: '',
      color: '#2481cc',
      textColor: '#ffffff',
      isVisible: false,
      isProgressVisible: false,
      isActive: true,
      setText: (text: string) => {
        mockWebApp.MainButton.text = text;
        console.log('[Mock TG] MainButton.setText:', text);
      },
      onClick: (callback: () => void) => {
        console.log('[Mock TG] MainButton.onClick registered');
      },
      show: () => {
        mockWebApp.MainButton.isVisible = true;
        console.log('[Mock TG] MainButton.show');
      },
      hide: () => {
        mockWebApp.MainButton.isVisible = false;
        console.log('[Mock TG] MainButton.hide');
      },
      enable: () => {
        mockWebApp.MainButton.isActive = true;
        console.log('[Mock TG] MainButton.enable');
      },
      disable: () => {
        mockWebApp.MainButton.isActive = false;
        console.log('[Mock TG] MainButton.disable');
      },
      showProgress: (leaveActive?: boolean) => {
        mockWebApp.MainButton.isProgressVisible = true;
        console.log('[Mock TG] MainButton.showProgress');
      },
      hideProgress: () => {
        mockWebApp.MainButton.isProgressVisible = false;
        console.log('[Mock TG] MainButton.hideProgress');
      },
    },
    BackButton: {
      isVisible: false,
      show: () => {
        mockWebApp.BackButton.isVisible = true;
        console.log('[Mock TG] BackButton.show');
      },
      hide: () => {
        mockWebApp.BackButton.isVisible = false;
        console.log('[Mock TG] BackButton.hide');
      },
      onClick: (callback: () => void) => {
        console.log('[Mock TG] BackButton.onClick registered');
      },
    },
    HapticFeedback: {
      impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
        console.log('[Mock TG] HapticFeedback.impactOccurred:', style);
      },
      notificationOccurred: (type: 'error' | 'success' | 'warning') => {
        console.log('[Mock TG] HapticFeedback.notificationOccurred:', type);
      },
      selectionChanged: () => {
        console.log('[Mock TG] HapticFeedback.selectionChanged');
      },
    },
    showAlert: (message: string, callback?: () => void) => {
      console.log('[Mock TG] showAlert:', message);
      alert(message);
      if (callback) callback();
    },
    showPopup: (
      params: {
        title: string;
        message: string;
        buttons: Array<{ text: string; type?: string }>;
      },
      callback?: (buttonId: string) => void
    ) => {
      console.log('[Mock TG] showPopup:', params);
      const result = confirm(`${params.title}\n\n${params.message}`);
      if (callback) callback(result ? 'ok' : 'cancel');
    },
    expand: () => {
      mockWebApp.isExpanded = true;
      console.log('[Mock TG] expand');
    },
    close: () => {
      console.log('[Mock TG] close - В реальном TG приложение закрылось бы');
      alert('В реальном Telegram приложение закрылось бы');
    },
    ready: () => {
      console.log('[Mock TG] ready');
    },
  };

  return mockWebApp;
};

/**
 * Инициализация мока Telegram WebApp
 * Вызовите эту функцию, если хотите использовать кастомного тестового пользователя
 */
export const initMockTelegramWebApp = (mockUser?: MockTelegramUser) => {
  if (typeof window !== 'undefined' && !window.Telegram?.WebApp) {
    console.log('[Mock TG] Инициализация мока Telegram WebApp для тестирования');
    console.log('[Mock TG] Тестовый пользователь:', mockUser || 'дефолтный');

    window.Telegram = {
      WebApp: createMockTelegramWebApp(mockUser) as any,
    };
  }
};
