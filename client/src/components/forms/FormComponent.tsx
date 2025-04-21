
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { SocketEvent } from "@/types/socket"
import { USER_STATUS } from "@/types/user"
import axios from "axios"
import { ChangeEvent, FormEvent, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import { useLocation, useNavigate } from "react-router-dom"
import { v4 as uuidv4 } from "uuid"

const FormComponent = () => {
    const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const location = useLocation()
    const { currentUser, setCurrentUser, status, setStatus } = useAppContext()
    const { socket } = useSocket()
    const currentlocal = localStorage.getItem("username") || "";
    console.log("Current username from localStorage:", currentlocal);
    

    const usernameRef = useRef<HTMLInputElement | null>(null)
    const navigate = useNavigate()
    
    useEffect(() => {
        if (currentlocal) {
            console.log("Setting username from localStorage:", currentlocal);
            setCurrentUser({ ...currentUser, username: currentlocal });
        }
    }, [currentlocal]);

    const createNewRoomId = () => {
        const newRoomId = uuidv4();
        setCurrentUser({ ...currentUser, roomId: newRoomId });
        console.log("Created new room ID:", newRoomId);
        toast.success("Created a new Room Id");
        usernameRef.current?.focus();
    }
    
    const handleInputChanges = (e: ChangeEvent<HTMLInputElement>) => {
        const name = e.target.name;
        const value = e.target.value;
        console.log(`Input changed: ${name} = ${value}`);
        setCurrentUser({ ...currentUser, [name]: value });
    }

    const validateForm = () => {
        if (currentUser.username.trim().length === 0) {
            toast.error("Enter your username");
            return false;
        } else if (currentUser.roomId.trim().length === 0) {
            toast.error("Enter a room id");
            return false;
        } else if (currentUser.roomId.trim().length < 5) {
            toast.error("ROOM Id must be at least 5 characters long");
            return false;
        } else if (currentUser.username.trim().length < 3) {
            toast.error("Username must be at least 3 characters long");
            return false;
        }
        return true;
    }

    const joinRoom = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        const roomId = currentUser.roomId;
        const username = currentUser.username;
        console.log("Attempting to join room:", roomId, username);
        
        try {
            const response = await axios.post(
                `${API}/create-or-update-room`,
                {
                    roomId,
                    username,
                },
            );
            console.log("Server response:", response.data);
            localStorage.setItem("data", JSON.stringify(response.data.data));
            toast.success(response.data.message);
            
            // Only attempt to join via socket if we're not already trying
            if (status !== USER_STATUS.ATTEMPTING_JOIN) {
                toast.loading("Joining room...");
                setStatus(USER_STATUS.ATTEMPTING_JOIN);
                socket.emit(SocketEvent.JOIN_REQUEST, currentUser);
                
                // We'll navigate in the useEffect below when socket confirms join
                // setCurrentUser({ ...currentUser, roomId: "" }); // Don't reset room ID yet
            }
        } catch (error) {
            console.error("Error joining room:", error);
            toast.error("Failed to join room. Please try again.");
        }
    }

    useEffect(() => {
        if (currentUser.roomId.length > 0) return;
        if (location.state?.roomId) {
            setCurrentUser({ ...currentUser, roomId: location.state.roomId });
            if (currentUser.username.length === 0) {
                toast.success("Enter your username");
            }
        }
    }, [currentUser, location.state?.roomId, setCurrentUser]);

    useEffect(() => {
        if (status === USER_STATUS.DISCONNECTED && !socket.connected) {
            console.log("Socket disconnected, reconnecting...");
            socket.connect();
            return;
        }

        const isRedirect = sessionStorage.getItem("redirect") || false;
        console.log("Current status:", status, "isRedirect:", isRedirect);

        if (status === USER_STATUS.JOINED && !isRedirect) {
            const username = currentUser.username;
            console.log("Joined room, redirecting to editor...");
            sessionStorage.setItem("redirect", "true");
            navigate(`/editor/${currentUser.roomId}`, {
                state: {
                    username,
                },
            });
        } else if (status === USER_STATUS.JOINED && isRedirect) {
            console.log("Already redirected, resetting socket...");
            sessionStorage.removeItem("redirect");
            setStatus(USER_STATUS.DISCONNECTED);
            socket.disconnect();
            socket.connect();
        }
    }, [
        currentUser,
        location.state?.redirect,
        navigate,
        setStatus,
        socket,
        status,
    ]);

    return (
        <div className="flex w-full max-w-[500px] flex-col items-center justify-center gap-4 p-4 sm:w-[500px] sm:p-8">
            <h2 className="bg-gradient-to-r from-green-500 via-green-600 to-green-700 bg-clip-text text-4xl font-bold text-transparent">
                Code Sync
            </h2>

            <form
                onSubmit={joinRoom}
                className="flex w-full flex-col gap-4 rounded-lg bg-black bg-opacity-60 p-8 shadow-lg backdrop-blur-md"
            >
                <input
                    type="text"
                    name="roomId"
                    placeholder="Enter Room Id"
                    className="w-full rounded-md border border-green-500 bg-black bg-opacity-70 px-3 py-3 text-green-500 placeholder:text-green-300 focus:outline-none"
                    onChange={handleInputChanges}
                    value={currentUser.roomId}
                />

                <input
                    type="text"
                    name="username"
                    placeholder={
                        currentUser.username ? currentUser.username : "enter"
                    }
                    className="w-full rounded-md border border-green-500 bg-black bg-opacity-70 px-3 py-3 text-green-500 placeholder:text-green-300 focus:outline-none"
                    onChange={handleInputChanges}
                    value={currentUser.username}
                    ref={usernameRef}
                />
                <button
                    type="submit"
                    className="mt-2 w-full rounded-md bg-green-500 px-8 py-3 text-lg font-semibold text-black hover:bg-green-400"
                >
                    Join
                </button>
                <button
                    type="button"
                    className="cursor-pointer select-none text-green-500 underline hover:text-green-300"
                    onClick={createNewRoomId}
                >
                    Create Room with One Click
                </button>
            </form>
        </div>
    )
}

export default FormComponent
