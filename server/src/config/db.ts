
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://ankngizkajsebhlllsrl.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFua25naXprYWpzZWJobGxsc3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxNTY5NDUsImV4cCI6MjA1ODczMjk0NX0.DU93wU7JW0XDm23E7syZfNDUPH2TykVVE9wBZliu7do';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const connectDB = async (): Promise<void> => {
  try {
    console.log('Attempting to connect to Supabase...');
    
    // Test the connection by checking if tables exist
    const { data: tableExists, error: tableError } = await supabase
      .from('users')
      .select('count');
    
    if (tableError) {
      console.error('Error checking users table:', tableError.message);
      // Try creating the tables
      console.log('Attempting to create required tables...');
      await createTables();
    } else {
      console.log('Successfully connected to Supabase');
    }
  } catch (error) {
    console.error('Error connecting to Supabase:', error);
    process.exit(1); // Exit process with failure
  }
};

// Function to create tables if they don't exist
async function createTables() {
  try {
    // Create users table
    const { error: createUsersError } = await supabase.rpc('create_users_table');
    if (createUsersError) {
      console.error('Error creating users table:', createUsersError);
    } else {
      console.log('Users table created or already exists');
    }
    
    // Create rooms table
    const { error: createRoomsError } = await supabase.rpc('create_rooms_table');
    if (createRoomsError) {
      console.error('Error creating rooms table:', createRoomsError);
    } else {
      console.log('Rooms table created or already exists');
    }
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}
