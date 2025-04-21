import express, { Response, Request } from "express";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import { SocketEvent, SocketId } from "./types/socket";
import { USER_CONNECTION_STATUS, User as UserType } from "./types/user";
import { Server } from "socket.io";
import path from "path";
import bcrypt from "bcryptjs";
import User, { IUser } from "./models/User";
import { connectDB } from "./config/db";
import Room, { RoomData } from "./models/Room";
import VersionControl, { BranchData, CommitData } from "./models/VersionControl";

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
app.post("/create-or-update-room", async (req: Request, res: Response) => {
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
          data: { user: username, roomId: roomId, type: "user" },
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
        data: { user: username, roomId: roomId, type: "user" },
      });
    } else {
      // If room does not exist, create a new room with the provided username in both username field and users array
      const roomData = {
        roomId,
        username,
        users: [username],
      };
      
      const newRoom = await Room.save(roomData);
      
      res.json({
        message: "Room created successfully",
        data: { user: username, roomId: roomId, type: "admin" },
      });
    }
  } catch (error) {
    console.error("Create/update room error:", error);
    res.status(500).json({ message: "Failed to create or update room" });
  }
});

// Get room info
app.get('/lock', async (req: Request, res: Response) => {
  try {
    const roomId = req.query.roomId as string;
    console.log("Get room info for roomId:", roomId);

    // Use roomId to fetch the room information
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json({ admin: room.username });
  } catch (error) {
    console.error("Get room info error:", error);
    res.status(500).json({ message: 'Failed to get room info' });
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

let userSocketMap: UserType[] = [];

// Function to get all users in a room
function getUsersInRoom(roomId: string): UserType[] {
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

function getUserBySocketId(socketId: SocketId): UserType | null {
  const user = userSocketMap.find((user) => user.socketId === socketId);
  if (!user) {
    console.log(`No user found for socket ID: ${socketId} - this is normal for new connections`);
    return null;
  }
  return user;
}

// Function to unlock files when a user leaves
function unlockUserFiles(username: string, roomId: string): void {
  // Emit an event to unlock all files locked by this user
  io.to(roomId).emit(SocketEvent.USER_LEFT_UNLOCK_FILES, { username });
}

// Function to remove user from room
function removeUserFromRoom(admin: string, targetUsername: string, roomId: string): void {
  // Find the user to remove
  const userToRemove = userSocketMap.find(user => 
    user.roomId === roomId && user.username === targetUsername
  );
  
  if (userToRemove) {
    // Emit an event to the user being removed
    io.to(userToRemove.socketId).emit(SocketEvent.REMOVED_FROM_ROOM, { 
      by: admin 
    });
    
    // Unlock all files locked by this user
    unlockUserFiles(targetUsername, roomId);
    
    // Remove user from socket map
    userSocketMap = userSocketMap.filter(user => 
      !(user.roomId === roomId && user.username === targetUsername)
    );
    
    // Notify other users in the room
    io.to(roomId).emit(SocketEvent.USER_REMOVED, { 
      username: targetUsername, 
      by: admin 
    });
  }
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
    
    // Unlock files when user leaves
    unlockUserFiles(user.username, roomId);
    
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

  // Handle file lock toggling
  socket.on(SocketEvent.FILE_LOCK_TOGGLED, ({ fileId, username, isLocked }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    socket.broadcast.to(roomId).emit(SocketEvent.FILE_LOCK_TOGGLED, { 
      fileId, 
      username, 
      isLocked 
    });
  });

  // Handle user removal
  socket.on(SocketEvent.REMOVE_USER, ({ targetUsername }) => {
    const user = getUserBySocketId(socket.id);
    if (!user) return;
    
    // Only room admin can remove users
    const roomId = user.roomId;
    
    // Check if user is admin
    Room.findOne({ roomId })
      .then(room => {
        if (room && room.username === user.username) {
          // This user is the admin, proceed with removal
          removeUserFromRoom(user.username, targetUsername, roomId);
        } else {
          // Not admin, send error
          io.to(socket.id).emit(SocketEvent.ERROR, { 
            message: "Only room admin can remove users" 
          });
        }
      })
      .catch(error => {
        console.error("Error checking admin status:", error);
      });
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

  // Handle test generation
  socket.on(SocketEvent.GENERATE_TEST, ({ fileName, fileContent, framework }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    
    // In a real implementation, this would use an API to generate tests
    // For this example, we'll just emit a success event with sample code
    const testCode = `// Generated test for ${fileName}\n// Using ${framework}\n\ndescribe('${fileName}', () => {\n  it('should work correctly', () => {\n    expect(true).toBe(true);\n  });\n});`;
    
    io.to(socket.id).emit(SocketEvent.TEST_GENERATED, {
      fileName,
      testCode,
      framework
    });
  });
  
  // Handle version control actions
  socket.on(SocketEvent.COMMIT_CHANGES, ({ message, files }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    const user = getUserBySocketId(socket.id);
    if (!user) return;
    
    // Create a commit object
    const commit = {
      id: `c${Date.now().toString(16)}`,
      message,
      author: user.username,
      timestamp: new Date().toISOString(),
      files: files.length
    };
    
    // Broadcast to all users in the room
    io.to(roomId).emit(SocketEvent.COMMIT_CREATED, commit);
  });
  
  socket.on(SocketEvent.BRANCH_CREATED, ({ name }) => {
    const user = getUserBySocketId(socket.id);
    if (!user) return;
    
    const roomId = user.roomId;
    
    try {
      // Set all branches to not current
      const existingBranches = await VersionControl.findBranches(roomId);
      for (const branch of existingBranches) {
        if (branch.id && branch.is_current) {
          await VersionControl.updateBranch(branch.id, { is_current: false });
        }
      }
      
      // Create new branch
      const branchData: BranchData = {
        room_id: roomId,
        name,
        is_current: true,
        created_by: user.username
      };
      
      VersionControl.createBranch(branchData);
    } catch (error) {
      console.error('Error in BRANCH_CREATED socket handler:', error);
    }
    
    // Broadcast to all users in the room
    socket.broadcast.to(roomId).emit(SocketEvent.BRANCH_CREATED, {
      name,
      by: user.username
    });
  });
  
  socket.on(SocketEvent.BRANCH_SWITCHED, ({ name }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    const user = getUserBySocketId(socket.id);
    if (!user) return;
    
    // Broadcast to all users in the room
    io.to(roomId).emit(SocketEvent.BRANCH_SWITCHED, {
      name,
      by: user.username
    });
  });
  
  socket.on(SocketEvent.PULL_CODE, ({ branch }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    const user = getUserBySocketId(socket.id);
    if (!user) return;
    
    // Broadcast to all users in the room
    io.to(roomId).emit(SocketEvent.PULL_CODE, {
      branch,
      by: user.username
    });
  });
  
  socket.on(SocketEvent.MERGE_BRANCHES, ({ from, to }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    const user = getUserBySocketId(socket.id);
    if (!user) return;
    
    // Broadcast to all users in the room
    io.to(roomId).emit(SocketEvent.MERGE_BRANCHES, {
      from,
      to,
      by: user.username
    });
  });
});

const PORT = process.env.PORT || 3001;

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
