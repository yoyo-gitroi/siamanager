import { useState } from 'react';

interface OAuthResponse {
  authUrl: string;
  state: string;
}

export const useInstagramOAuth = () => {
  // Temporarily disabled - Instagram tables not yet migrated
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const startOAuth = async () => {
    // Temporarily disabled
    return null;
  };

  const handleCallback = async (_code: string) => {
    // Temporarily disabled
    return false;
  };

  return {
    startOAuth,
    handleCallback,
    loading,
    error,
  };
};
