import { useQuery } from "@tanstack/react-query";

export interface AuthUser {
  id: string;
  email: string | null;
  username: string;
  displayName: string | null;
  replitUserId: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

async function fetchUser(): Promise<AuthUser | null> {
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

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch,
  };
}
