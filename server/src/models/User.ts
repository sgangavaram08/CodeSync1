
import { supabase } from '../config/db';

export interface IUser {
  id?: string;
  username: string;
  mobile: string;
  password: string;
}

const User = {
  async findOne(query: { username?: string; mobile?: string }): Promise<IUser | null> {
    let supabaseQuery = supabase.from('users').select('*');
    
    if (query.username) {
      supabaseQuery = supabaseQuery.eq('username', query.username);
    } else if (query.mobile) {
      supabaseQuery = supabaseQuery.eq('mobile', query.mobile);
    }
    
    const { data, error } = await supabaseQuery.single();
    
    if (error) {
      return null;
    }
    
    return data;
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
