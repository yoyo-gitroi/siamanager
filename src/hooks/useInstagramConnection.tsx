import { useState } from 'react';

interface InstagramConnection {
  id: string;
  instagram_user_id: string;
  username: string;
  account_type: string | null;
  profile_picture_url: string | null;
  connected_at: string;
  last_synced_at: string | null;
  token_expiry: string | null;
}

export const useInstagramConnection = () => {
  // Temporarily disabled - Instagram tables not yet migrated
  const [connection] = useState<InstagramConnection | null>(null);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const disconnect = async () => {
    // Temporarily disabled
  };

  return {
    connection,
    isConnected: false,
    loading,
    error,
    disconnect,
    isTokenExpiringSoon: false,
  };
};
