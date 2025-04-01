import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import useResponsive from "@/hooks/useResponsive"
import { SocketEvent } from "@/types/socket"
import { useEffect, useState } from "react"
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa"
import { MdCallEnd } from "react-icons/md"
import toast from "react-hot-toast"

function VoiceCallView() {
    const { viewHeight } = useResponsive()
    const { socket } = useSocket()
    const { users, currentUser } = useAppContext()
    const [isCallActive, setIsCallActive] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
    const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map())

    // Initialize voice call
    const startVoiceCall = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            setLocalStream(stream)
            setIsCallActive(true)
            
            // Notify other users about the call
            socket.emit(SocketEvent.SEND_MESSAGE, {
                content: `${currentUser.username} started a voice call`,
                type: "system",
            })
            
            // Create peer connections for each user
            users.forEach(user => {
                if (user.username !== currentUser.username) {
                    createPeerConnection(user.username, stream)
                }
            })
            
            toast.success("Voice call started")
        } catch (error) {
            console.error("Error accessing microphone:", error)
            toast.error("Could not access microphone")
        }
    }

    // Create a peer connection for a specific user
    const createPeerConnection = (username: string, stream: MediaStream) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" }
            ]
        })
        
        // Add local tracks to the connection
        stream.getTracks().forEach(track => {
            pc.addTrack(track, stream)
        })
        
        // Handle ICE candidates
        pc.onicecandidate = event => {
            if (event.candidate) {
                socket.emit("ice-candidate", {
                    candidate: event.candidate,
                    target: username
                })
            }
        }
        
        // Handle incoming remote streams
        pc.ontrack = event => {
            const newRemoteStreams = new Map(remoteStreams)
            newRemoteStreams.set(username, event.streams[0])
            setRemoteStreams(newRemoteStreams)
        }
        
        // Store the peer connection
        const newPeerConnections = new Map(peerConnections)
        newPeerConnections.set(username, pc)
        setPeerConnections(newPeerConnections)
        
        return pc
    }

    // End the voice call
    const endVoiceCall = () => {
        // Stop all tracks in the local stream
        localStream?.getTracks().forEach(track => track.stop())
        setLocalStream(null)
        
        // Close all peer connections
        peerConnections.forEach(pc => pc.close())
        setPeerConnections(new Map())
        setRemoteStreams(new Map())
        setIsCallActive(false)
        
        // Notify other users
        socket.emit(SocketEvent.SEND_MESSAGE, {
            content: `${currentUser.username} ended the voice call`,
            type: "system",
        })
        
        toast.success("Voice call ended")
    }

    // Toggle microphone mute state
    const toggleMute = () => {
        if (localStream) {
            const audioTracks = localStream.getAudioTracks()
            audioTracks.forEach(track => {
                track.enabled = isMuted
            })
            setIsMuted(!isMuted)
            
            toast.success(isMuted ? "Microphone unmuted" : "Microphone muted")
        }
    }

    // Clean up when component unmounts
    useEffect(() => {
        return () => {
            localStream?.getTracks().forEach(track => track.stop())
            peerConnections.forEach(pc => pc.close())
        }
    }, [localStream, peerConnections])

    return (
        <div
            className="flex max-h-full min-h-[400px] w-full flex-col gap-4 p-4"
            style={{ height: viewHeight }}
        >
            <h1 className="view-title">Voice Call</h1>
            
            <div className="flex flex-col items-center justify-center gap-6 pt-4">
                {!isCallActive ? (
                    <button
                        className="flex items-center justify-center gap-2 rounded-full bg-green-500 px-6 py-3 text-white transition-transform hover:scale-105"
                        onClick={startVoiceCall}
                    >
                        <FaMicrophone size={20} />
                        <span>Start Voice Call</span>
                    </button>
                ) : (
                    <div className="flex w-full flex-col items-center gap-4">
                        <div className="text-center">
                            <p className="mb-1 text-lg font-semibold">Voice Call Active</p>
                            <p className="text-sm text-gray-400">{users.length} participants</p>
                        </div>
                        
                        <div className="flex w-full flex-wrap justify-center gap-4 py-4">
                            {/* Local user */}
                            <div className="flex flex-col items-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl text-white">
                                    {currentUser.username.charAt(0).toUpperCase()}
                                </div>
                                <p className="mt-2 text-sm">{currentUser.username} (You)</p>
                            </div>
                            
                            {/* Remote users */}
                            {Array.from(remoteStreams.entries()).map(([username, _]) => (
                                <div key={username} className="flex flex-col items-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500 text-xl text-white">
                                        {username.charAt(0).toUpperCase()}
                                    </div>
                                    <p className="mt-2 text-sm">{username}</p>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-4 flex items-center gap-4">
                            <button
                                className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 transition-transform hover:scale-105"
                                onClick={toggleMute}
                            >
                                {isMuted ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
                            </button>
                            
                            <button
                                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 transition-transform hover:scale-105"
                                onClick={endVoiceCall}
                            >
                                <MdCallEnd size={24} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default VoiceCallView
