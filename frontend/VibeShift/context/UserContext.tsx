import { useAuth, useUser } from '@clerk/clerk-expo';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

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
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Helper: always get a valid token ──────────────────────────────────────
  const freshToken = useCallback(async (): Promise<string | null> => {
    let token = await getToken();
    if (!token) token = await getToken({ skipCache: true } as any);
    return token ?? null;
  }, [getToken]);

  // ── Load profile from backend ─────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = await freshToken();
      if (!token) { console.warn('[UserContext] refreshProfile: no token'); return; }
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile({
          id:             data.id,
          name:           data.name          ?? null,
          email:          data.email,
          bio:            data.bio           ?? null,
          avatar_url:     data.avatar_url    ?? null,
          audio_quality:  data.audio_quality ?? 'high',
          export_format:  data.export_format ?? 'wav',
          tracks_demixed: data.tracks_demixed ?? 0,
          genres_changed: data.genres_changed ?? 0,
        });
      } else {
        console.warn('[UserContext] GET /users/me failed', res.status);
      }
    } catch (e) {
      console.warn('[UserContext] refreshProfile error', e);
    }
    finally { setLoading(false); }
  }, [freshToken]);

  // ── On sign-in: sync Clerk user → DB, then load profile ──────────────────
  // This runs automatically whenever isSignedIn flips to true (login / app resume).
  // POST /auth/sync is idempotent — safe to call every sign-in.
  useEffect(() => {
    if (!isSignedIn || !user) {
      if (!isSignedIn) setProfile(null); // clear profile on sign-out
      return;
    }

    (async () => {
      try {
        const token = await freshToken();
        if (!token) return;

        const email = user.emailAddresses?.[0]?.emailAddress ?? '';
        // Priority: Clerk display name → Clerk username → email prefix.
        // Email prefix ensures new email-only accounts always get a name on first sync.
        const name  =
          [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
          user.username?.trim() ||
          email.split('@')[0] ||
          undefined;

        // Create/update user row in our DB — required before any other API call
        const syncRes = await fetch(`${API_URL}/auth/sync`, {
          method: 'POST',
          headers: {
            Authorization:  `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, name }),
        });
        if (!syncRes.ok) console.warn('[UserContext] POST /auth/sync failed', syncRes.status);

        // Now fetch the full profile (tracks_demixed, export_format, etc.)
        await refreshProfile();
      } catch (e) {
        console.warn('[UserContext] sync effect error', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, user?.id]); // re-run only when sign-in state or user changes

  return (
    <UserContext.Provider value={{ profile, loading, refreshProfile, setProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useProfile() {
  return useContext(UserContext);
}