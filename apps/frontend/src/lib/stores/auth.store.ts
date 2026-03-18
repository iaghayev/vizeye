import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
interface AuthState {
  user: any | null; isAuthenticated: boolean; isLoading: boolean;
  setUser:(u:any)=>void; clearUser:()=>void; setLoading:(v:boolean)=>void;
}
export const useAuthStore = create<AuthState>()(persist(
  (set) => ({
    user:null, isAuthenticated:false, isLoading:true,
    setUser:(user)=>set({user,isAuthenticated:true,isLoading:false}),
    clearUser:()=>set({user:null,isAuthenticated:false,isLoading:false}),
    setLoading:(v)=>set({isLoading:v}),
  }),
  { name:'vizeye-auth', storage:createJSONStorage(()=>localStorage), partialize:(s)=>({user:s.user,isAuthenticated:s.isAuthenticated}) },
));
