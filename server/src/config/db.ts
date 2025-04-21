
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
      // Check for version control tables
      await createVersionControlTables();
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
    
    // Create version control tables
    await createVersionControlTables();
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

// Function to create version control tables
async function createVersionControlTables() {
  try {
    // Check if version_control_branches table exists
    const { data: branchesTableExists, error: branchesCheckError } = await supabase
      .from('version_control_branches')
      .select('count')
      .limit(1);
    
    if (branchesCheckError && branchesCheckError.code === '42P01') {
      // Table doesn't exist, create it
      const { error: createBranchesError } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS version_control_branches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          room_id TEXT NOT NULL,
          name TEXT NOT NULL,
          is_current BOOLEAN DEFAULT false,
          created_by TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
      `);
      
      if (createBranchesError) {
        console.error('Error creating version_control_branches table:', createBranchesError);
      } else {
        console.log('version_control_branches table created');
      }
    } else {
      console.log('version_control_branches table already exists');
    }
    
    // Check if version_control_commits table exists
    const { data: commitsTableExists, error: commitsCheckError } = await supabase
      .from('version_control_commits')
      .select('count')
      .limit(1);
    
    if (commitsCheckError && commitsCheckError.code === '42P01') {
      // Table doesn't exist, create it
      const { error: createCommitsError } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS version_control_commits (
          id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL,
          message TEXT NOT NULL,
          author TEXT NOT NULL,
          files_count INTEGER NOT NULL,
          branch TEXT NOT NULL,
          merge_source TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
      `);
      
      if (createCommitsError) {
        console.error('Error creating version_control_commits table:', createCommitsError);
      } else {
        console.log('version_control_commits table created');
      }
    } else {
      console.log('version_control_commits table already exists');
    }
  } catch (error) {
    console.error('Error checking or creating version control tables:', error);
  }
}
