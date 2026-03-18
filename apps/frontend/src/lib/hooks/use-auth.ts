'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authApi } from '../api/auth.api';
import { tokenStore } from '../api';
import { useAuthStore } from '../stores/auth.store';

export function useAuth() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, isAuthenticated, isLoading, setUser, clearUser, setLoading } = useAuthStore();

  const { data: me, isError } = useQuery({
    queryKey: ['auth','me'],
    queryFn:  authApi.getMe,
    enabled:  !!tokenStore.getAccess() && !user,
    retry:    false,
    staleTime: 5*60*1000,
  });

  useEffect(() => {
    if (me)      { setUser(me); }
    if (isError) { tokenStore.clear(); clearUser(); }
    setLoading(false);
  }, [me, isError]);

  const loginMut = useMutation({
    mutationFn: authApi.login,
    onSuccess: (d) => { tokenStore.set(d.tokens); setUser(d.user); toast.success(`Welcome back, ${d.user.firstName||d.user.email}`); router.push('/dashboard'); },
    onError:   (e:any) => toast.error(e.message||'Login failed'),
  });

  const logout = async () => { await authApi.logout(); clearUser(); qc.clear(); router.push('/login'); };

  return { user, isAuthenticated, isLoading, login:(dto:any)=>loginMut.mutate(dto), logout, isLoginPending:loginMut.isPending };
}
