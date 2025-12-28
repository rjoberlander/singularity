import { supabase } from './supabase';

export const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    return {};
  }
  
  return {
    'Authorization': `Bearer ${session.access_token}`
  };
};
