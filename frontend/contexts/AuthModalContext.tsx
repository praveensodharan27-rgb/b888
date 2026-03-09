'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import LoginModal from '@/components/LoginModal';
import SignupModal from '@/components/SignupModal';

type OnSuccessCallback = () => void;

declare global {
  interface WindowEventMap {
    openLoginModal: CustomEvent<{ onSuccess?: OnSuccessCallback }>;
    openSignupModal: CustomEvent<{ onSuccess?: OnSuccessCallback }>;
  }
}

interface AuthModalContextValue {
  openLoginModal: (onSuccess?: OnSuccessCallback) => void;
  openSignupModal: (onSuccess?: OnSuccessCallback) => void;
  closeLoginModal: () => void;
  closeSignupModal: () => void;
  isLoginOpen: boolean;
  isSignupOpen: boolean;
  onLoginSuccess: OnSuccessCallback | null;
  onSignupSuccess: OnSuccessCallback | null;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isLoginOpen, setLoginOpen] = useState(false);
  const [isSignupOpen, setSignupOpen] = useState(false);
  const [onLoginSuccess, setOnLoginSuccess] = useState<OnSuccessCallback | null>(null);
  const [onSignupSuccess, setOnSignupSuccess] = useState<OnSuccessCallback | null>(null);

  const openLoginModal = useCallback((onSuccess?: OnSuccessCallback) => {
    setOnLoginSuccess(() => onSuccess ?? null);
    setSignupOpen(false);
    setLoginOpen(true);
  }, []);

  const openSignupModal = useCallback((onSuccess?: OnSuccessCallback) => {
    setOnSignupSuccess(() => onSuccess ?? null);
    setLoginOpen(false);
    setSignupOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setLoginOpen(false);
    setOnLoginSuccess(null);
  }, []);

  const closeSignupModal = useCallback(() => {
    setSignupOpen(false);
    setOnSignupSuccess(null);
  }, []);

  // Global event listener: any component can dispatch openLoginModal/openSignupModal
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onLogin = (e: CustomEvent<{ onSuccess?: OnSuccessCallback }>) => {
      openLoginModal(e.detail?.onSuccess);
    };
    const onSignup = (e: CustomEvent<{ onSuccess?: OnSuccessCallback }>) => {
      openSignupModal(e.detail?.onSuccess);
    };
    window.addEventListener('openLoginModal', onLogin as EventListener);
    window.addEventListener('openSignupModal', onSignup as EventListener);
    return () => {
      window.removeEventListener('openLoginModal', onLogin as EventListener);
      window.removeEventListener('openSignupModal', onSignup as EventListener);
    };
  }, [openLoginModal, openSignupModal]);

  const handleLoginSuccess = useCallback(() => {
    if (onLoginSuccess) {
      onLoginSuccess();
      setOnLoginSuccess(null);
    }
    setLoginOpen(false);
  }, [onLoginSuccess]);

  const handleSignupSuccess = useCallback(() => {
    if (onSignupSuccess) {
      onSignupSuccess();
      setOnSignupSuccess(null);
    }
    setSignupOpen(false);
  }, [onSignupSuccess]);

  return (
    <AuthModalContext.Provider
      value={{
        openLoginModal,
        openSignupModal,
        closeLoginModal,
        closeSignupModal,
        isLoginOpen,
        isSignupOpen,
        onLoginSuccess,
        onSignupSuccess,
      }}
    >
      {children}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={closeLoginModal}
        onLoginSuccess={onLoginSuccess}
        onSwitchToSignup={() => {
          closeLoginModal();
          openSignupModal(onLoginSuccess ?? undefined);
        }}
      />
      <SignupModal
        isOpen={isSignupOpen}
        onClose={closeSignupModal}
        onSignupSuccess={onSignupSuccess}
        onSwitchToLogin={() => {
          closeSignupModal();
          openLoginModal(onSignupSuccess ?? undefined);
        }}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    return {
      openLoginModal: () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('openLoginModal', { detail: {} }));
        }
      },
      openSignupModal: () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('openSignupModal', { detail: {} }));
        }
      },
      closeLoginModal: () => {},
      closeSignupModal: () => {},
      isLoginOpen: false,
      isSignupOpen: false,
      onLoginSuccess: null,
      onSignupSuccess: null,
    };
  }
  return ctx;
}
