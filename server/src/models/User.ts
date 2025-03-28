
import { supabase } from '../config/db';

export interface IUser {
  id?: string;
  username: string;
  mobile: string;
  password: string;
}

const User = {
  async findOne(query: { username?: string; mobile?: string; $or?: Array<{username?: string; mobile?: string}> }): Promise<IUser | null> {
    // Handle MongoDB-style $or queries
    if (query.$or) {
      // This emulates MongoDB's $or functionality
      for (const condition of query.$or) {
        let supabaseQuery = supabase.from('users').select('*');
        
        if (condition.username) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', condition.username)
            .single();
          
          if (!error && data) {
            return data;
          }
        } else if (condition.mobile) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('mobile', condition.mobile)
            .single();
          
          if (!error && data) {
            return data;
          }
        }
      }
      return null;
    }
    
    // Regular query
    let supabaseQuery = supabase.from('users').select('*');
    
    if (query.username) {
      supabaseQuery = supabaseQuery.eq('username', query.username);
    } else if (query.mobile) {
      supabaseQuery = supabaseQuery.eq('mobile', query.mobile);
    }
    
    try {
      const { data, error } = await supabaseQuery.maybeSingle();
      
      if (error) {
        console.error('Error finding user:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in findOne:', error);
      return null;
    }
  },
  
  async save(userData: IUser): Promise<IUser | null> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: userData.username,
        mobile: userData.mobile,
        password: userData.password,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving user:', error);
      return null;
    }
    
    return data;
  }
};

export default User;
