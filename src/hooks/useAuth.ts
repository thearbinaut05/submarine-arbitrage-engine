import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
export function useAuth(){
 const [user,setUser]=useState<User|null>(null); const [isLoading,setIsLoading]=useState(true); const [authError,setAuthError]=useState<string|null>(null);
 useEffect(()=>{ if(!isSupabaseConfigured){setIsLoading(false);return} let m=true; supabase.auth.getSession().then(({data,error})=>{if(!m)return; if(error)setAuthError(error.message); setUser(data.session?.user??null); setIsLoading(false)}).catch((e)=>{if(m){setAuthError(e instanceof Error?e.message:'Auth unavailable');setIsLoading(false)}}); const{data:sub}=supabase.auth.onAuthStateChange((_e,s)=>{setUser(s?.user??null);setIsLoading(false)}); return()=>{m=false;sub.subscription.unsubscribe()}},[]);
 const signInWithGoogle=useCallback(async()=>{setAuthError(null); if(!isSupabaseConfigured){setAuthError('Supabase not configured. Use built-in wallet.');return} const redirectTo=window.location.origin+(import.meta.env.BASE_URL||'/'); const{error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo}}); if(error)setAuthError(error.message+' Enable Google in Supabase Auth Providers and add '+redirectTo+' as redirect URL. Built-in wallet works without Google.')},[]);
 const signInWithEmail=useCallback(async(email:string)=>{setAuthError(null); if(!isSupabaseConfigured){setAuthError('Supabase not configured. Use built-in wallet.');return} const redirectTo=window.location.origin+(import.meta.env.BASE_URL||'/'); const{error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo}}); if(error)setAuthError(error.message); else setAuthError('Check your email for a magic sign-in link.')},[]);
 const signOut=useCallback(async()=>{try{await supabase.auth.signOut()}catch{} setUser(null)},[]);
 return{user,isLoading,authError,isSupabaseConfigured,signInWithGoogle,signInWithEmail,signOut};
}
