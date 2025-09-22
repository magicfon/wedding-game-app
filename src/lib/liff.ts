declare global {
  interface Window {
    liff: {
      init: (config: { liffId: string }) => Promise<void>
      isInClient: () => boolean
      isLoggedIn: () => boolean
      getProfile: () => Promise<LiffProfile>
      login: () => void
      logout: () => void
      closeWindow: () => void
      sendMessages: (messages: Array<{ type: string; text: string }>) => void
    }
  }
}

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

let liffInitialized = false;

// 初始化 LIFF
export const initLiff = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  try {
    // 載入 LIFF SDK
    if (!window.liff) {
      console.log('Loading LIFF SDK...');
      const script = document.createElement('script');
      script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
      script.async = true;
      
      await new Promise((resolve, reject) => {
        script.onload = () => {
          console.log('LIFF SDK loaded successfully');
          resolve(void 0);
        };
        script.onerror = (error) => {
          console.error('Failed to load LIFF SDK:', error);
          reject(error);
        };
        document.head.appendChild(script);
      });
    }

    // 初始化 LIFF
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    console.log('LIFF ID:', liffId ? 'Found' : 'Not found', liffId ? `(${liffId})` : '');
    
    if (!liffId) {
      console.error('LIFF ID not found in environment variables');
      return false;
    }

    if (!liffInitialized) {
      console.log('Initializing LIFF with ID:', liffId);
      await window.liff.init({ liffId });
      liffInitialized = true;
      
      // 檢查環境
      const isInClient = window.liff.isInClient();
      const isLoggedIn = window.liff.isLoggedIn();
      console.log('LIFF Environment:', {
        isInClient,
        isLoggedIn,
        environment: isInClient ? 'LINE App' : 'External Browser'
      });
    }

    return true;
  } catch (error) {
    console.error('LIFF initialization failed:', error);
    
    // 提供更詳細的錯誤信息
    if (error instanceof Error) {
      if (error.message.includes('client_id')) {
        console.error('LIFF client_id error - check NEXT_PUBLIC_LIFF_ID configuration');
      }
    }
    
    return false;
  }
};

// 檢查是否在 LIFF 環境中
export const isInLiff = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.liff?.isInClient() || false;
};

// 檢查是否已登入
export const isLoggedIn = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.liff?.isLoggedIn() || false;
};

// 獲取用戶資料
export const getProfile = async (): Promise<LiffProfile | null> => {
  try {
    if (!isLoggedIn()) return null;
    return await window.liff.getProfile();
  } catch (error) {
    console.error('Failed to get profile:', error);
    return null;
  }
};

// LIFF 登入 - 支援外部瀏覽器
export const liffLogin = (): void => {
  if (typeof window !== 'undefined' && window.liff) {
    // 在外部瀏覽器中，LIFF 的 login() 方法會自動重定向到 LINE Login 頁面
    // 然後返回到當前頁面，這是 LIFF 的標準行為
    window.liff.login();
  } else {
    console.error('LIFF not initialized');
    alert('登入系統未初始化，請重新載入頁面');
  }
};

// LIFF 登出
export const liffLogout = (): void => {
  if (typeof window !== 'undefined' && window.liff) {
    window.liff.logout();
  }
};

// 關閉 LIFF 視窗
export const closeLiff = (): void => {
  if (typeof window !== 'undefined' && window.liff) {
    window.liff.closeWindow();
  }
};

// 傳送訊息給 Line Bot
export const sendMessageToBot = (message: string): void => {
  if (typeof window !== 'undefined' && window.liff?.isInClient()) {
    window.liff.sendMessages([{
      type: 'text',
      text: message
    }]);
  }
};
