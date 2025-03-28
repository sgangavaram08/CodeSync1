
import express, { Response, Request } from "express";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import { SocketEvent, SocketId } from "./types/socket";
import { USER_CONNECTION_STATUS, User as UserType } from "./types/user";
import { Server } from "socket.io";
import path from "path";
import bcrypt from "bcryptjs";
import User from "./models/User";
import { connectDB } from "./config/db";
import Room, { RoomData } from "./models/Room";

dotenv.config();

const app = express();

app.use(express.json());

app.use(cors());

app.use(express.static(path.join(__dirname, "public"))); // Serve static files
connectDB();
//routes
app.post("/register", async (req: RegisterRequest, res: Response) => {
  try {
    const { username, mobile, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { mobile }],
    });

    console.log("Existing user check:", existingUser);

    if (
      existingUser?.username === username ||
      existingUser?.mobile === mobile
    ) {
      return res
        .status(400)
        .json({ message: "Username or mobile number already exists." });
    } else {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = {
        username,
        mobile,
        password: hashedPassword,
      };
      
      const savedUser = await User.save(newUser);
      console.log("User saved:", savedUser);

      return res.status(201).json({ message: "User registered successfully" });
    }
    // Save user to database
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    // Check if the username exists
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Username not found" });
    }
    // Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
//create room db
app.post("/create-or-update-room", async (req, res) => {
  try {
    const { roomId, username } = req.body;
    console.log("Create/update room request:", roomId, username);
    // Check if room already exists
    const existingRoom = await Room.findOne({ roomId });
    if (existingRoom) {
      // If room exists, check if user is already in the users array
      if (existingRoom.users && existingRoom.users.includes(username)) {
        return res.json({
          message: "User already in users list",
          data: { user: username, roomId: roomId, type: "user", lock: existingRoom.lock },
        });
      }

      // If user is not in the array, add them
      if (!existingRoom.users) {
        existingRoom.users = [];
      }
      existingRoom.users.push(username);
      await existingRoom.save();
      res.json({
        message: "User added to room successfully",
        data: { user: username, roomId: roomId, type: "user", lock: existingRoom.lock },
      });
    } else {
      // If room does not exist, create a new room with the provided username in both username field and users array
      const roomData = {
        roomId,
        username,
        users: [username],
        lock: false
      };
      
      const newRoom = await Room.save(roomData);
      
      res.json({
        message: "Room created successfully",
        data: { user: username, roomId: roomId, type: "admin", lock: false },
      });
    }
  } catch (error) {
    console.error("Create/update room error:", error);
    res.status(500).json({ message: "Failed to create or update room" });
  }
});

//lock feature
app.post("/set-lock", async (req, res) => {
  try {
    const { roomId, lock } = req.body;
    console.log("Set lock request:", roomId, lock);
    // Find the room and update the lock value
    const room = await Room.findOneAndUpdate(
      { roomId },
      { lock }, 
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({ message: "Lock updated successfully" });
  } catch (error) {
    console.error("Set lock error:", error);
    res.status(500).json({ message: "Failed to update lock" });
  }
});

//get lock value 
app.get('/lock', async (req, res) => {
  try {
    const roomId = req.query.roomId as string;
    console.log("Get lock request for roomId:", roomId);

    // Use roomId to fetch the lock value
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json({ lock: room.lock, admin: room.username });
  } catch (error) {
    console.error("Get lock error:", error);
    res.status(500).json({ message: 'Failed to get lock value' });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
  maxHttpBufferSize: 1e8,
  pingTimeout: 60000,
});

let userSocketMap: User[] = [];

// Function to get all users in a room
function getUsersInRoom(roomId: string): User[] {
  return userSocketMap.filter((user) => user.roomId == roomId);
}

// Function to get room id by socket id
function getRoomId(socketId: SocketId): string | null {
  const roomId = userSocketMap.find(
    (user) => user.socketId === socketId
  )?.roomId;

  if (!roomId) {
    console.error("Room ID is undefined for socket ID:", socketId);
    return null;
  }
  return roomId;
}

function getUserBySocketId(socketId: SocketId): User | null {
  const user = userSocketMap.find((user) => user.socketId === socketId);
  if (!user) {
    console.error("User not found for socket ID:", socketId);
    return null;
  }
  return user;
}

io.on("connection", (socket) => {
  // Handle user actions
  socket.on(SocketEvent.JOIN_REQUEST, ({ roomId, username }) => {
    // Check is username exist in the room
    const isUsernameExist = getUsersInRoom(roomId).filter(
      (u) => u.username === username
    );
    if (isUsernameExist.length > 0) {
      io.to(socket.id).emit(SocketEvent.USERNAME_EXISTS);
      return;
    }

    const user = {
      username,
      roomId,
      status: USER_CONNECTION_STATUS.ONLINE,
      cursorPosition: 0,
      typing: false,
      socketId: socket.id,
      currentFile: null,
    };
    userSocketMap.push(user);
    socket.join(roomId);
    socket.broadcast.to(roomId).emit(SocketEvent.USER_JOINED, { user });
    const users = getUsersInRoom(roomId);
    io.to(socket.id).emit(SocketEvent.JOIN_ACCEPTED, { user, users });
  });

  socket.on("disconnecting", () => {
    const user = getUserBySocketId(socket.id);
    if (!user) return;
    const roomId = user.roomId;
    socket.broadcast.to(roomId).emit(SocketEvent.USER_DISCONNECTED, { user });
    userSocketMap = userSocketMap.filter((u) => u.socketId !== socket.id);
    socket.leave(roomId);
  });

  // Handle file actions
  socket.on(
    SocketEvent.SYNC_FILE_STRUCTURE,
    ({ fileStructure, openFiles, activeFile, socketId }) => {
      io.to(socketId).emit(SocketEvent.SYNC_FILE_STRUCTURE, {
        fileStructure,
        openFiles,
        activeFile,
      });
    }
  );

  socket.on(SocketEvent.DIRECTORY_CREATED, ({ parentDirId, newDirectory }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_CREATED, {
      parentDirId,
      newDirectory,
    });
  });

  socket.on(SocketEvent.DIRECTORY_UPDATED, ({ dirId, children }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_UPDATED, {
      dirId,
      children,
    });
  });

  socket.on(SocketEvent.DIRECTORY_RENAMED, ({ dirId, newName }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_RENAMED, {
      dirId,
      newName,
    });
  });

  socket.on(SocketEvent.DIRECTORY_DELETED, ({ dirId }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_DELETED, { dirId });
  });

  socket.on(SocketEvent.FILE_CREATED, ({ parentDirId, newFile }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    socket.broadcast
      .to(roomId)
      .emit(SocketEvent.FILE_CREATED, { parentDirId, newFile });
  });

  socket.on(SocketEvent.FILE_UPDATED, ({ fileId, newContent }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    socket.broadcast.to(roomId).emit(SocketEvent.FILE_UPDATED, {
      fileId,
      newContent,
    });
  });

  socket.on(SocketEvent.FILE_RENAMED, ({ fileId, newName }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    socket.broadcast.to(roomId).emit(SocketEvent.FILE_RENAMED, {
      fileId,
      newName,
    });
  });

  socket.on(SocketEvent.FILE_DELETED, ({ fileId }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    socket.broadcast.to(roomId).emit(SocketEvent.FILE_DELETED, { fileId });
  });

  // Handle user status
  socket.on(SocketEvent.USER_OFFLINE, ({ socketId }) => {
    userSocketMap = userSocketMap.map((user) => {
      if (user.socketId === socketId) {
        return { ...user, status: USER_CONNECTION_STATUS.OFFLINE };
      }
      return user;
    });
    const roomId = getRoomId(socketId);
    if (!roomId) return;
    socket.broadcast.to(roomId).emit(SocketEvent.USER_OFFLINE, { socketId });
  });

  socket.on(SocketEvent.USER_ONLINE, ({ socketId }) => {
    userSocketMap = userSocketMap.map((user) => {
      if (user.socketId === socketId) {
        return { ...user, status: USER_CONNECTION_STATUS.ONLINE };
      }
      return user;
    });
    const roomId = getRoomId(socketId);
    if (!roomId) return;
    socket.broadcast.to(roomId).emit(SocketEvent.USER_ONLINE, { socketId });
  });

  // Handle chat actions
  socket.on(SocketEvent.SEND_MESSAGE, ({ message }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    socket.broadcast.to(roomId).emit(SocketEvent.RECEIVE_MESSAGE, { message });
  });

  // Handle cursor position
  socket.on(SocketEvent.TYPING_START, ({ cursorPosition }) => {
    userSocketMap = userSocketMap.map((user) => {
      if (user.socketId === socket.id) {
        return { ...user, typing: true, cursorPosition };
      }
      return user;
    });
    const user = getUserBySocketId(socket.id);
    if (!user) return;
    const roomId = user.roomId;
    socket.broadcast.to(roomId).emit(SocketEvent.TYPING_START, { user });
  });

  socket.on(SocketEvent.TYPING_PAUSE, () => {
    userSocketMap = userSocketMap.map((user) => {
      if (user.socketId === socket.id) {
        return { ...user, typing: false };
      }
      return user;
    });
    const user = getUserBySocketId(socket.id);
    if (!user) return;
    const roomId = user.roomId;
    socket.broadcast.to(roomId).emit(SocketEvent.TYPING_PAUSE, { user });
  });

  socket.on(SocketEvent.REQUEST_DRAWING, () => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    socket.broadcast
      .to(roomId)
      .emit(SocketEvent.REQUEST_DRAWING, { socketId: socket.id });
  });

  socket.on(SocketEvent.SYNC_DRAWING, ({ drawingData, socketId }) => {
    socket.broadcast
      .to(socketId)
      .emit(SocketEvent.SYNC_DRAWING, { drawingData });
  });

  socket.on(SocketEvent.DRAWING_UPDATE, ({ snapshot }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    socket.broadcast.to(roomId).emit(SocketEvent.DRAWING_UPDATE, {
      snapshot,
    });
  });
});

const PORT = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
  // Send the index.html file
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

interface RegisterRequest extends Request {
  body: {
    username: string;
    mobile: string;
    password: string;
  };
}

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
