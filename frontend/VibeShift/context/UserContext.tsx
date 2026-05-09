import { useAuth } from '@clerk/clerk-expo';
import React, { createContext, useCallback, useContext, useState } from 'react';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  audio_quality: string;
  export_format: string;
  tracks_demixed: number;
  genres_changed: number;
}

interface UserContextType {
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  setProfile: (p: UserProfile) => void;
}

const UserContext = createContext<UserContextType>({
  profile: null,
  loading: false,
  refreshProfile: async () => {},
  setProfile: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile({
          id: data.id,
          name: data.name ?? null,
          email: data.email,
          bio: data.bio ?? null,
          avatar_url: data.avatar_url ?? null,
          audio_quality: data.audio_quality ?? 'high',
          export_format: data.export_format ?? 'wav',
          tracks_demixed: data.tracks_demixed ?? 0,
          genres_changed: data.genres_changed ?? 0,
        });
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [getToken]);

  return (
    <UserContext.Provider value={{ profile, loading, refreshProfile, setProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useProfile() {
  return useContext(UserContext);
}
