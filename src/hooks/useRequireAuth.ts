import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useRequireAuth() {
  const { session } = useAuth();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInFeatureName, setSignInFeatureName] = useState('this feature');

  const requireAuth = useCallback((featureName: string, action: () => void) => {
    if (!session) {
      setSignInFeatureName(featureName);
      setShowSignInModal(true);
      return;
    }
    action();
  }, [session]);

  const dismissSignInModal = useCallback(() => {
    setShowSignInModal(false);
  }, []);

  return {
    isAuthenticated: !!session,
    showSignInModal,
    signInFeatureName,
    requireAuth,
    dismissSignInModal,
  };
}
