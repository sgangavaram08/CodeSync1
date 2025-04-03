
import { useAppContext } from "@/context/AppContext";
import { useSocket } from "@/context/SocketContext";
import { SocketEvent } from "@/types/socket";
import { RemoteUser, USER_CONNECTION_STATUS } from "@/types/user";
import { useState } from "react";
import toast from "react-hot-toast";
import { IoPersonRemove } from "react-icons/io5";

function Users() {
    const { users, currentUser } = useAppContext();
    const { socket } = useSocket();
    const [data] = useState(() => {
        const storedData = localStorage.getItem("data");
        return storedData ? JSON.parse(storedData) : { type: "" };
    });

    const removeUser = (username: string) => {
        if (!username || !currentUser) return;
        
        socket.emit(SocketEvent.REMOVE_USER, { targetUsername: username });
        toast.success(`User ${username} removed successfully`);
    };

    return (
        <div className="flex flex-col gap-4 pt-4 overflow-auto">
            {users.map((user: RemoteUser, index: number) => (
                <div
                    key={`${user.username}-${index}`}
                    className="flex items-center justify-between rounded-md bg-white/10 p-3"
                >
                    <div className="flex items-center gap-2">
                        <div
                            className={`h-2 w-2 rounded-full 
                      ${
                          user.status === USER_CONNECTION_STATUS.ONLINE
                              ? "animate-pulse bg-green-400"
                              : "bg-red-400"
                      }`}
                        />
                        <div className="font-medium text-white">{user.username}</div>
                    </div>
                    {data.type === "admin" && user.username !== currentUser.username && (
                        <button
                            className="text-red-400 hover:text-red-300"
                            onClick={() => removeUser(user.username)}
                            title="Remove user"
                        >
                            <IoPersonRemove size={20} />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}

export default Users;
