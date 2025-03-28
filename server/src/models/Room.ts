import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomId: String,
  username: { type: String, required: false },
  users: [{ type: String }],
  lock: { type: Boolean, default: false }, // Add a lock field with default value false
});

const Room = mongoose.model('Room', roomSchema);

export default Room;
