
export type SocketId = string;

export enum SocketEvent {
  // General events
  CONNECTION = "connection",
  DISCONNECT = "disconnect",
  ERROR = "error",

  // User events
  JOIN_REQUEST = "join-request",
  JOIN_ACCEPTED = "join-accepted",
  USERNAME_EXISTS = "username-exists",
  USER_JOINED = "user-joined",
  USER_DISCONNECTED = "user-disconnected",
  USER_OFFLINE = "user-offline",
  USER_ONLINE = "user-online",
  USER_REMOVED = "user-removed",
  REMOVE_USER = "remove-user",
  REMOVED_FROM_ROOM = "removed-from-room",
  USER_LEFT_UNLOCK_FILES = "user-left-unlock-files",

  // File structure events
  SYNC_FILE_STRUCTURE = "sync-file-structure",
  DIRECTORY_CREATED = "directory-created",
  DIRECTORY_UPDATED = "directory-updated",
  DIRECTORY_RENAMED = "directory-renamed",
  DIRECTORY_DELETED = "directory-deleted",
  FILE_CREATED = "file-created",
  FILE_UPDATED = "file-updated",
  FILE_RENAMED = "file-renamed",
  FILE_DELETED = "file-deleted",
  FILE_LOCK_TOGGLED = "file-lock-toggled",

  // Chat events
  SEND_MESSAGE = "send-message",
  RECEIVE_MESSAGE = "receive-message",

  // Typing events
  TYPING_START = "typing-start",
  TYPING_PAUSE = "typing-pause",

  // Drawing events
  REQUEST_DRAWING = "request-drawing",
  SYNC_DRAWING = "sync-drawing",
  DRAWING_UPDATE = "drawing-update"
}
