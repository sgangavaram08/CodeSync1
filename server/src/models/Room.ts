
import { supabase } from '../config/db';

// Define types for Room data
export interface RoomData {
  id?: string;
  room_id: string;
  username?: string;
  users: string[];
  lock: boolean;
  save?: () => Promise<RoomData | null>;
}

// Room model with methods to interact with Supabase
const Room = {
  async findOne(query: { roomId?: string }): Promise<RoomData | null> {
    try {
      if (!query.roomId) {
        return null;
      }
      
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_id', query.roomId)
        .maybeSingle();
      
      if (error) {
        console.error('Error finding room:', error);
        return null;
      }
      
      if (!data) return null;
      
      // Add a save method to the returned data to mimic MongoDB behavior
      const roomWithSave: RoomData = {
        ...data,
        save: async function() {
          const { data: updatedData, error: updateError } = await supabase
            .from('rooms')
            .update({
              users: this.users,
              lock: this.lock
            })
            .eq('room_id', this.room_id)
            .select()
            .single();
          
          if (updateError) {
            console.error('Error saving room:', updateError);
            return null;
          }
          
          return updatedData;
        }
      };
      
      return roomWithSave;
    } catch (error) {
      console.error('Error in findOne:', error);
      return null;
    }
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
