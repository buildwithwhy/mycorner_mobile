import { supabase } from './client';
import { ALL_USER_TABLES } from './tables';
import logger from '../../utils/logger';

export const deleteUserAccount = async (userId: string) => {
  try {
    for (const table of ALL_USER_TABLES) {
      await supabase.from(table).delete().eq('user_id', userId);
    }
    await supabase.auth.signOut();
    return { error: null };
  } catch (error) {
    logger.error('Error deleting user account:', error);
    return { error };
  }
};
