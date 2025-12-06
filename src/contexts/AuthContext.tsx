import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface AuthUser {
  id: string;
  email: string | null;
  username: string;
  displayName: string | null;
  replitUserId: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserProfile {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  playingExperience: string | null;
  preferredPlayStyle: string | null;
  memberSince: string | null;
  profileImage: string | null;
  sportId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserRole {
  id: string;
  userId: string;
  role: 'admin' | 'coach' | 'player';
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  userProfile: UserProfile | null;
  userRoles: UserRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

async function fetchAuthUser(): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/user', {
    credentials: 'include',
  });
  
  if (response.status === 401) {
    return null;
  }
  
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  
  return response.json();
}

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const response = await fetch(`/api/profiles/${userId}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    return null;
  }
  
  return response.json();
}

async function fetchUserRole(userId: string): Promise<UserRole | null> {
  const response = await fetch(`/api/user-roles/${userId}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    return null;
  }
  
  return response.json();
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: fetchAuthUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (user?.id) {
      fetchUserProfile(user.id).then(setUserProfile).catch(console.error);
      fetchUserRole(user.id).then(setUserRoles).catch(console.error);
    } else {
      setUserProfile(null);
      setUserRoles(null);
    }
  }, [user?.id]);

  const login = useCallback(() => {
    window.location.href = '/api/login';
  }, []);

  const logout = useCallback(() => {
    queryClient.clear();
    window.location.href = '/api/logout';
  }, [queryClient]);

  const refetchUser = useCallback(() => {
    refetch();
  }, [refetch]);

  const value: AuthContextType = {
    user: user ?? null,
    userProfile,
    userRoles,
    loading: isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refetchUser,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
