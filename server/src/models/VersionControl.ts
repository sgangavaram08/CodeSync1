
import { supabase } from '../config/db';

// Define types for version control data
export interface BranchData {
  id?: string;
  room_id: string;
  name: string;
  is_current: boolean;
  created_by: string;
  created_at?: string;
}

export interface CommitData {
  id: string;
  room_id: string;
  message: string;
  author: string;
  files_count: number;
  branch: string;
  merge_source?: string;
  created_at?: string;
}

// VersionControl model with methods to interact with Supabase
const VersionControl = {
  async findBranches(roomId: string): Promise<BranchData[]> {
    try {
      const { data, error } = await supabase
        .from('version_control_branches')
        .select('*')
        .eq('room_id', roomId);
      
      if (error) {
        console.error('Error finding branches:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in findBranches:', error);
      return [];
    }
  },
  
  async findCurrentBranch(roomId: string): Promise<BranchData | null> {
    try {
      const { data, error } = await supabase
        .from('version_control_branches')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_current', true)
        .maybeSingle();
      
      if (error) {
        console.error('Error finding current branch:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in findCurrentBranch:', error);
      return null;
    }
  },
  
  async createBranch(branchData: BranchData): Promise<BranchData | null> {
    try {
      const { data, error } = await supabase
        .from('version_control_branches')
        .insert(branchData)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating branch:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in createBranch:', error);
      return null;
    }
  },
  
  async updateBranch(id: string, updates: Partial<BranchData>): Promise<BranchData | null> {
    try {
      const { data, error } = await supabase
        .from('version_control_branches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating branch:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in updateBranch:', error);
      return null;
    }
  },
  
  async findCommits(roomId: string, branch?: string): Promise<CommitData[]> {
    try {
      let query = supabase
        .from('version_control_commits')
        .select('*')
        .eq('room_id', roomId);
      
      if (branch) {
        query = query.eq('branch', branch);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error finding commits:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in findCommits:', error);
      return [];
    }
  },
  
  async createCommit(commitData: CommitData): Promise<CommitData | null> {
    try {
      const { data, error } = await supabase
        .from('version_control_commits')
        .insert(commitData)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating commit:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in createCommit:', error);
      return null;
    }
  }
};

export default VersionControl;
