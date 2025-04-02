
import { useAppContext } from "@/context/AppContext"
import { useFileSystem } from "@/context/FileContext"
import { useSettings } from "@/context/SettingContext"
import { useSocket } from "@/context/SocketContext"
import usePageEvents from "@/hooks/usePageEvents"
import useResponsive from "@/hooks/useResponsive"
import { editorThemes } from "@/resources/Themes"
import { FileSystemItem } from "@/types/file"
import { SocketEvent } from "@/types/socket"
import { color } from "@uiw/codemirror-extensions-color"
import { hyperLink } from "@uiw/codemirror-extensions-hyper-link"
import { LanguageName, loadLanguage } from "@uiw/codemirror-extensions-langs";
import { FaLockOpen } from "react-icons/fa";
import { FaLock } from "react-icons/fa";
import './Editor.css';
import CodeMirror, {
    Extension,
    ViewUpdate,
    scrollPastEnd,
} from "@uiw/react-codemirror"
import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { cursorTooltipBaseTheme, tooltipField } from "./tooltip"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { User } from "@/types/user"
import axios from "axios"

function Editor() {
    type RoomParams = {
        roomId: string | undefined
    }

    // Use the type with useParams
    const params = useParams<RoomParams>()
    const { roomId } = params
    const [lock, setLock] = useState(false)

    const navigate = useNavigate()

    const location = useLocation()
    const API = import.meta.env.VITE_API_URL;
    const [showPopup, setShowPopup] = useState(false)
    const [msg, setmsg] = useState("")
    const { users, currentUser, setCurrentUser, setUsers, status } =
        useAppContext()
    const [Type, SetType] = useState("")

    const { activeFile, setActiveFile, toggleFileLock } = useFileSystem()
    const { theme, language, fontSize } = useSettings()
    const { socket } = useSocket()
    const { viewHeight } = useResponsive()
    const [timeOut, setTimeOut] = useState(setTimeout(() => { }, 0))
    const filteredUsers = useMemo(
        () => users.filter((u) => u.username !== currentUser.username),
        [users, currentUser],
    )
    const [extensions, setExtensions] = useState<Extension[]>([])

    const isFileLockedByOthers = activeFile?.isLocked && activeFile?.lockedBy !== currentUser.username;

    const onCodeChange = (code: string, view: ViewUpdate) => {
        if (!activeFile) return
        if (isFileLockedByOthers) {
            toast.error(`This file is locked by ${activeFile.lockedBy}`)
            return
        }

        const file: FileSystemItem = { ...activeFile, content: code }
        setActiveFile(file)
        const cursorPosition = view.state?.selection?.main?.head
        socket.emit(SocketEvent.TYPING_START, { cursorPosition })
        socket.emit(SocketEvent.FILE_UPDATED, {
            fileId: activeFile.id,
            newContent: code,
        })
        clearTimeout(timeOut)

        const newTimeOut = setTimeout(
            () => socket.emit(SocketEvent.TYPING_PAUSE),
            1000,
        )
        setTimeOut(newTimeOut)
    }

    // Listen wheel event to zoom in/out and prevent page reload
    usePageEvents()
    ///lock feature
    const handleLock = async () => {
        try {
            const response = await axios.post(
                `${API}/set-lock`,
                {
                    roomId: roomId,
                    lock: true,
                },
            )
            setLock(true)
            toast.success("Room locked successfully", { duration: 3000 })
        } catch (error) {
            console.error(error)
            toast.error("Failed to lock room", { duration: 3000 })
        }
    }
    
    const handleUnLock = async () => {
        try {
            const response = await axios.post(
                `${API}/set-lock`,
                {
                    roomId: roomId,
                    lock: false,
                },
            )
            setLock(false)
            toast.success("Room unlocked successfully", { duration: 3000 })
        } catch (error) {
            console.error(error)
            toast.error("Failed to unlock room", { duration: 3000 })
        }
    }

    // File lock toggle
    const handleToggleFileLock = () => {
        if (!activeFile) return;
        toggleFileLock(activeFile.id, currentUser.username);
        
        const lockStatus = activeFile.isLocked ? 'unlocked' : 'locked';
        toast.success(`File ${lockStatus} successfully`, { duration: 3000 });
    }
    
    //mesage popup
    useEffect(() => {
        if (currentUser.username.length > 0) return
        const username: string = localStorage.getItem("username") ?? ""

        if (username === undefined) {
            navigate("/", {
                state: { roomId },
            })
        } else if (roomId) {
            const user: User = { username, roomId }

            setCurrentUser(user)
            socket.emit(SocketEvent.JOIN_REQUEST, user)
        }
    }, [
        currentUser.username,
        location.state?.username,
        navigate,
        roomId,
        setCurrentUser,
        socket,
    ])

    const handleLoadLockValue = async () => {
        try {
            const response = await axios.get(`${API}/lock`, {
                params: {
                    roomId,
                },
            })
            setShowPopup(true)
            setLock(response.data.lock)
            setmsg(`${response.data.admin}`)
            
            // Hide notification after 3 seconds
            setTimeout(() => {
                setShowPopup(false)
            }, 3000)
        } catch (error) {
            console.error(error, "error while getting lock value")
        }
    }
    
    useEffect(() => {
        handleLoadLockValue()
    }, [lock])

    useEffect(() => {
        const storedData = localStorage.getItem("data")
        if (storedData === null) {
            console.error("Data not found in local storage")
        } else {
            try {
                const data = JSON.parse(storedData)
                SetType(data.type)
            } catch (error) {
                console.error("Error parsing data:", error)
            }
        }

        const extensions = [
            color,
            hyperLink,
            tooltipField(filteredUsers),
            cursorTooltipBaseTheme,
            scrollPastEnd(),
        ]
        const langExt = loadLanguage(language.toLowerCase() as LanguageName)
        if (langExt) {
            extensions.push(langExt)
        } else {
            toast.error(
                "Syntax highlighting is unavailable for this language. Please adjust the editor settings; it may be listed under a different name.",
                {
                    duration: 5000,
                },
            )
        }

        setExtensions(extensions)
    }, [filteredUsers, language])

    return (
        <>
            <div className="relative">
                {/* Move Lock Room button to top right corner */}
                {Type && Type == "admin" && (
                   <div className="absolute top-2 right-2 z-10">
                       {lock == false ? (
                           <button
                               className="flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-pink-500 px-4 py-2 font-medium text-white shadow-lg transition-all hover:animate-pulse hover:shadow-xl active:scale-95"
                               onClick={handleLock}
                           >
                               <span>🔒</span>
                               <span>Lock Room</span>
                           </button>
                       ) : (
                           <button
                               className="flex items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-teal-500 px-4 py-2 font-medium text-white shadow-lg transition-all hover:animate-pulse hover:shadow-xl active:scale-95"
                               onClick={handleUnLock}
                           >
                               <span>🔓</span>
                               <span>Unlock Room</span>
                           </button>
                       )}
                   </div>
                )}
                
                {Type && Type == "user" && (
                    <div className="absolute top-2 right-2 z-10">
                        <button
                            style={{ cursor: "default" }}
                            className={
                                lock == true
                                    ? "flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-white"
                                    : "flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-white"
                            }
                        >
                            {lock == true ? 
                                <span className="flex items-center"><FaLock className="mr-2" /> Room Locked</span> 
                                : <span className="flex items-center"><FaLockOpen className="mr-2" /> Room Unlocked</span>
                            }
                        </button>
                    </div>
                )}
                
                {/* File lock toggle button - available for all users */}
                {activeFile && (
                    <button 
                        className="absolute bottom-1 right-32 z-10 flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 font-medium text-white shadow-lg transition-all hover:animate-pulse hover:shadow-xl active:scale-95"
                        onClick={handleToggleFileLock}
                        disabled={isFileLockedByOthers}
                        title={isFileLockedByOthers ? `Locked by ${activeFile.lockedBy}` : activeFile.isLocked ? "Unlock this file" : "Lock this file"}
                    >
                        <span>{activeFile.isLocked ? <FaLock /> : <FaLockOpen />}</span>
                        <span>{activeFile.isLocked ? "Unlock File" : "Lock File"}</span>
                    </button>
                )}
                
                {/* File lock status indicator when locked by others */}
                {isFileLockedByOthers && (
                    <div className="absolute bottom-1 left-2 z-10 flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 font-medium text-white">
                        <span><FaLock /></span>
                        <span>Locked by {activeFile.lockedBy}</span>
                    </div>
                )}
            </div>
            {msg && Type == "user" && showPopup && (
                <div className="absolute bottom-20 right-7 z-50">
                    <div id={lock ? "animatedButton" : "animatedButtonn"} className="rounded-lg p-4 shadow-md backdrop-blur-md backdrop-brightness-125 backdrop-filter">
                        <p className="text-lg font-bold" style={{ textShadow: "0.5px 0.5px 3px black" }}>
                            {lock ? 
                                <span>{msg} - <span style={{ color: "red", textShadow: "1px 1px 3px black" }}>has Locked the room</span></span> 
                                : <span>{msg} - <span style={{ color: "yellow", textShadow: "1px 1px 3px black" }}>has Unlocked the room</span></span>
                            }
                        </p>
                    </div>
                </div>
            )}
            <CodeMirror
                theme={editorThemes[theme]}
                onChange={onCodeChange}
                value={activeFile?.content}
                extensions={extensions}
                minHeight="100%"
                maxWidth="100vw"
                style={{
                    fontSize: fontSize + "px",
                    height: viewHeight,
                    position: "relative",
                }}
                readOnly={(Type !== "admin" && lock) || isFileLockedByOthers}
            />
        </>
    )
}

export default Editor
