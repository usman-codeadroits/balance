import { useCallback, useState } from 'react';

export function useSplashScreen() {
  const [isReady, setIsReady] = useState(false);

  const handleSplashComplete = useCallback(() => {
    setIsReady(true);
  }, []);

  return {
    isReady,
    handleSplashComplete,
  };
}
