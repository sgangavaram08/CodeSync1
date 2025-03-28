
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const connectDB = async (): Promise<void> => {
  try {
    // Test the connection by making a simple query
    const { data, error } = await supabase.from('rooms').select('count');
    
    if (error) throw error;
    
    console.log('Supabase Connected...');
  } catch (error) {
    console.error('Error connecting to Supabase:', error);
    process.exit(1); // Exit process with failure
  }
};

export { supabase, connectDB };
