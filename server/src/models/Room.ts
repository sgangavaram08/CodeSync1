
import { supabase } from '../config/db';

// Define types for Room data
export interface RoomData {
  room_id: string;
  username?: string;
  users: string[];
  lock: boolean;
}

// Room model with methods to interact with Supabase
const Room = {
  async findOne(query: { roomId?: string }): Promise<RoomData | null> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_id', query.roomId)
      .single();
    
    if (error) {
      console.error('Error finding room:', error);
      return null;
    }
    
    return data;
  },
  
  async findOneAndUpdate(
    query: { roomId: string },
    update: { lock: boolean },
    options?: { new: boolean }
  ): Promise<RoomData | null> {
    const { data, error } = await supabase
      .from('rooms')
      .update({ lock: update.lock })
      .eq('room_id', query.roomId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating room:', error);
      return null;
    }
    
    return data;
  },
  
  async save(roomData: { 
    roomId: string; 
    username?: string; 
    users: string[];
    lock?: boolean;
  }): Promise<RoomData | null> {
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        room_id: roomData.roomId,
        username: roomData.username,
        users: roomData.users,
        lock: roomData.lock || false
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving room:', error);
      return null;
    }
    
    return data;
  }
};

export default Room;
