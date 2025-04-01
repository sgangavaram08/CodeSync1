import { useSocket } from "@/context/SocketContext"
import { useFileSystem } from "@/context/FileContext"
import useResponsive from "@/hooks/useResponsive"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { LuBranches, LuGitBranch, LuGitCommit, LuGitPullRequest, LuHistory } from "react-icons/lu"
import { TbGitCommit, TbGitPullRequest } from "react-icons/tb"
import { FiRefreshCw } from "react-icons/fi"

function VersionControlView() {
    const { viewHeight } = useResponsive()
    const { files } = useFileSystem()
    const { socket } = useSocket()
    
    const [commits, setCommits] = useState([
        { id: "c1", message: "Initial commit", author: "System", timestamp: new Date().toISOString(), changes: 3 },
        { id: "c2", message: "Added basic file structure", author: "System", timestamp: new Date().toISOString(), changes: 5 },
    ])
    const [branches, setBranches] = useState([
        { name: "main", isActive: true },
        { name: "dev", isActive: false },
    ])
    const [commitMessage, setCommitMessage] = useState("")
    const [changedFiles, setChangedFiles] = useState([])
    const [activeTab, setActiveTab] = useState("changes")

    // Simulate fetching changed files data
    useEffect(() => {
        const mockChangedFiles = files.slice(0, 3).map(file => ({
            id: file.id || Math.random().toString(),
            name: file.name || "File",
            status: Math.random() > 0.5 ? "modified" : "added",
            changes: Math.floor(Math.random() * 20) + 1
        }))
        setChangedFiles(mockChangedFiles)
    }, [files])

    // Create a new commit
    const createCommit = () => {
        if (!commitMessage.trim()) {
            toast.error("Please enter a commit message")
            return
        }

        const newCommit = {
            id: `c${commits.length + 1}`,
            message: commitMessage,
            author: "Current User",
            timestamp: new Date().toISOString(),
            changes: changedFiles.length
        }

        setCommits([newCommit, ...commits])
        setCommitMessage("")
        toast.success("Changes committed successfully")
        
        // Reset changed files to simulate commit completion
        setChangedFiles([])
    }

    // Switch branch
    const switchBranch = (branchName) => {
        const updatedBranches = branches.map(branch => ({
            ...branch,
            isActive: branch.name === branchName
        }))
        setBranches(updatedBranches)
        toast.success(`Switched to branch: ${branchName}`)
    }

    // Create a new branch
    const createBranch = () => {
        const branchName = prompt("Enter new branch name:")
        if (!branchName) return
        
        if (branches.some(b => b.name === branchName)) {
            toast.error("Branch already exists")
            return
        }
        
        const newBranch = { name: branchName, isActive: false }
        setBranches([...branches, newBranch])
        toast.success(`Branch '${branchName}' created`)
    }

    return (
        <div
            className="flex max-h-full min-h-[400px] w-full flex-col gap-2 p-4"
            style={{ height: viewHeight }}
        >
            <h1 className="view-title">Version Control</h1>
            
            {/* Branch selector */}
            <div className="mb-4 flex items-center gap-2">
                <div className="flex-grow">
                    <div className="flex items-center gap-2 rounded-md bg-darkHover p-2">
                        <LuGitBranch size={18} />
                        <select
                            className="flex-grow appearance-none bg-transparent text-white outline-none"
                            value={branches.find(b => b.isActive)?.name || "main"}
                            onChange={(e) => switchBranch(e.target.value)}
                        >
                            {branches.map(branch => (
                                <option key={branch.name} value={branch.name}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <button
                    className="flex items-center justify-center rounded-md bg-darkHover p-2 hover:bg-gray-700"
                    onClick={createBranch}
                    title="Create new branch"
                >
                    <LuBranches size={18} />
                </button>
                <button
                    className="flex items-center justify-center rounded-md bg-darkHover p-2 hover:bg-gray-700"
                    onClick={() => toast.success("Repository synchronized")}
                    title="Sync repository"
                >
                    <FiRefreshCw size={18} />
                </button>
            </div>
            
            {/* Tab navigation */}
            <div className="mb-2 flex border-b border-darkHover">
                <button
                    className={`px-4 py-2 ${activeTab === "changes" ? "border-b-2 border-primary font-bold" : ""}`}
                    onClick={() => setActiveTab("changes")}
                >
                    Changes
                </button>
                <button
                    className={`px-4 py-2 ${activeTab === "history" ? "border-b-2 border-primary font-bold" : ""}`}
                    onClick={() => setActiveTab("history")}
                >
                    History
                </button>
            </div>
            
            {/* Tab content */}
            <div className="flex-grow overflow-y-auto">
                {activeTab === "changes" ? (
                    <div>
                        {/* Changed files list */}
                        <div className="mb-4 rounded-md bg-darkHover p-2">
                            <h3 className="mb-2 text-sm font-bold">Changed Files</h3>
                            {changedFiles.length > 0 ? (
                                <ul className="space-y-1 text-sm">
                                    {changedFiles.map(file => (
                                        <li key={file.id} className="flex items-center justify-between py-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${file.status === 'modified' ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
                                                {file.name}
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {file.status === 'modified' ? `~${file.changes}` : `+${file.changes}`}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-400">No changes to commit</p>
                            )}
                        </div>
                        
                        {/* Commit form */}
                        <div className="mb-4">
                            <textarea
                                placeholder="Commit message"
                                className="min-h-[80px] w-full rounded-md border-none bg-darkHover p-2 text-white outline-none"
                                value={commitMessage}
                                onChange={(e) => setCommitMessage(e.target.value)}
                                disabled={changedFiles.length === 0}
                            />
                            <button
                                className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-primary p-2 font-bold text-black outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={createCommit}
                                disabled={!commitMessage.trim() || changedFiles.length === 0}
                            >
                                <TbGitCommit size={18} />
                                Commit Changes
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* Commit history */}
                        <ul className="space-y-4">
                            {commits.map(commit => (
                                <li key={commit.id} className="border-l-2 border-primary pl-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold">{commit.message}</h3>
                                            <p className="text-xs text-gray-400">
                                                {commit.author} · {new Date(commit.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center rounded-full bg-darkHover px-2 py-1 text-xs">
                                            <LuGitCommit size={12} className="mr-1" />
                                            {commit.id}
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <button 
                                            className="rounded-md bg-darkHover px-2 py-1 text-xs hover:bg-gray-700"
                                            onClick={() => toast.success("Changes viewed")}
                                        >
                                            View Changes ({commit.changes})
                                        </button>
                                        <button 
                                            className="flex items-center gap-1 rounded-md bg-darkHover px-2 py-1 text-xs hover:bg-gray-700"
                                            onClick={() => toast.success("Reverting changes")}
                                        >
                                            <LuHistory size={12} />
                                            Revert
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    )
}

export default VersionControlView