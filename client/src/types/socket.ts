
import { Socket } from "socket.io-client"

type SocketId = string

enum SocketEvent {
    JOIN_REQUEST = "join-request",
    JOIN_ACCEPTED = "join-accepted",
    USER_JOINED = "user-joined",
    USER_DISCONNECTED = "user-disconnected",
    SYNC_FILE_STRUCTURE = "sync-file-structure",
    DIRECTORY_CREATED = "directory-created",
    DIRECTORY_UPDATED = "directory-updated",
    DIRECTORY_RENAMED = "directory-renamed",
    DIRECTORY_DELETED = "directory-deleted",
    FILE_CREATED = "file-created",
    FILE_UPDATED = "file-updated",
    FILE_RENAMED = "file-renamed",
    FILE_DELETED = "file-deleted",
    USER_OFFLINE = "user-offline",
    USER_ONLINE = "online",
    SEND_MESSAGE = "send-message",
    RECEIVE_MESSAGE = "receive-message",
    TYPING_START = "typing-start",
    TYPING_PAUSE = "typing-pause",
    USERNAME_EXISTS = "username-exists",
    REQUEST_DRAWING = "request-drawing",
    SYNC_DRAWING = "sync-drawing",
    DRAWING_UPDATE = "drawing-update",
    FILE_LOCK_TOGGLED = "file-lock-toggled",
    GENERATE_TEST = "generate-test",
    TEST_GENERATED = "test-generated",
    COMMIT_CHANGES = "commit-changes",
    COMMIT_CREATED = "commit-created",
    BRANCH_CREATED = "branch-created",
    BRANCH_SWITCHED = "branch-switched",
    PULL_CODE = "pull-code",
    MERGE_BRANCHES = "merge-branches"
}

interface SocketContext {
    socket: Socket
}

export { SocketEvent, SocketContext, SocketId }
