
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ankngizkajsebhlllsrl.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFua25naXprYWpzZWJobGxsc3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxNTY5NDUsImV4cCI6MjA1ODczMjk0NX0.DU93wU7JW0XDm23E7syZfNDUPH2TykVVE9wBZliu7do';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const connectDB = async (): Promise<void> => {
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
