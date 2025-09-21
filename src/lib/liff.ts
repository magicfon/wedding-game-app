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
      const script = document.createElement('script');
      script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
      script.async = true;
      
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    // 初始化 LIFF
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      console.error('LIFF ID not found');
      return false;
    }

    if (!liffInitialized) {
      await window.liff.init({ liffId });
      liffInitialized = true;
    }

    return true;
  } catch (error) {
    console.error('LIFF initialization failed:', error);
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

// LIFF 登入
export const liffLogin = (): void => {
  if (typeof window !== 'undefined' && window.liff) {
    window.liff.login();
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
