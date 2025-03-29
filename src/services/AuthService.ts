
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export async function signUp(
  email: string,
  password: string,
  userData: {
    first_name: string;
    last_name: string;
    role: 'patient' | 'doctor';
    age?: number;
    specialty?: string;
  }
) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: userData
      }
    });
    
    if (error) {
      console.error('Signup error:', error);
      toast.error(error.message);
      throw error;
    }
    
    console.log('Signup successful:', data);
    toast.success('Signup successful! Please check your email to verify your account.');
    return data;
  } catch (error: any) {
    console.error('Unexpected signup error:', error);
    toast.error(error.message || 'An unexpected error occurred during signup.');
    throw error;
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    
    if (error) {
      console.error('Signin error:', error);
      toast.error(error.message);
      throw error;
    }
    
    console.log('Signin successful:', data);
    toast.success('Signin successful!');
    return data;
  } catch (error: any) {
    console.error('Unexpected signin error:', error);
    toast.error(error.message || 'An unexpected error occurred during signin.');
    throw error;
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Signout error:', error);
      toast.error(error.message);
      throw error;
    }
    
    console.log('Signout successful');
    toast.success('Signout successful!');
  } catch (error: any) {
    console.error('Unexpected signout error:', error);
    toast.error(error.message || 'An unexpected error occurred during signout.');
    throw error;
  }
}
