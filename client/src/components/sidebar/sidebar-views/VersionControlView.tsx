
import { useState, useEffect } from "react";
import { LuGitBranch, LuGitPullRequest, LuGitMerge, LuGitFork } from "react-icons/lu";
import { FaGitAlt } from "react-icons/fa";
import useResponsive from "@/hooks/useResponsive";
import { useFileSystem } from "@/context/FileContext";
import { useSocket } from "@/context/SocketContext";
import { useAppContext } from "@/context/AppContext";
import { SocketEvent } from "@/types/socket";
import toast from "react-hot-toast";

function VersionControlView() {
  const { viewHeight } = useResponsive();
  const { fileStructure, activeFile } = useFileSystem();
  const { socket } = useSocket();
  const { currentUser } = useAppContext();

  // State for branches, commits, changed files, and commit message
  const [branches, setBranches] = useState([
    { name: "main", current: true },
    { name: "develop", current: false },
    { name: "feature/user-auth", current: false },
  ]);

  const [commits, setCommits] = useState([]);
  const [changedFiles, setChangedFiles] = useState([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Track changes for version control
  useEffect(() => {
    const trackFileChanges = () => {
      // This function would be called whenever files are changed
      // It compares the current state with the last committed state
      // to identify modified, added, or deleted files

      // For this demo, we're simulating changed files based on the current file structure
      if (fileStructure && fileStructure.children) {
        const recentlyModified = fileStructure.children
          .filter(item => item.type === "file")
          .slice(0, 3) // Take the first 3 files as an example
          .map(file => ({
            id: file.id,
            name: file.name,
            status: Math.random() > 0.5 ? "modified" : "added",
            changes: Math.floor(Math.random() * 20) + 1,
          }));

        setChangedFiles(recentlyModified);
      }
    };

    // Initial tracking
    trackFileChanges();

    // Set up listeners for real-time tracking
    socket.on(SocketEvent.FILE_UPDATED, trackFileChanges);
    socket.on(SocketEvent.FILE_CREATED, trackFileChanges);
    socket.on(SocketEvent.FILE_DELETED, trackFileChanges);

    return () => {
      socket.off(SocketEvent.FILE_UPDATED, trackFileChanges);
      socket.off(SocketEvent.FILE_CREATED, trackFileChanges);
      socket.off(SocketEvent.FILE_DELETED, trackFileChanges);
    };
  }, [fileStructure, socket]);

  // Load commit history (simulated)
  useEffect(() => {
    // Simulate loading commit history from server
    const simulateCommitHistory = () => {
      const mockCommits = [
        { 
          id: "abc123", 
          message: "Initial commit", 
          author: currentUser.username, 
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          files: 3
        },
        { 
          id: "def456", 
          message: "Add version control feature", 
          author: currentUser.username, 
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          files: 5
        },
        { 
          id: "ghi789", 
          message: "Fix styling issues", 
          author: currentUser.username, 
          timestamp: new Date(Date.now() - 43200000).toISOString(),
          files: 2
        },
      ];

      setCommits(mockCommits);
    };

    simulateCommitHistory();

    // Listen for real-time commit events
    socket.on(SocketEvent.COMMIT_CREATED, (newCommit) => {
      setCommits((prevCommits) => [newCommit, ...prevCommits]);
    });

    return () => {
      socket.off(SocketEvent.COMMIT_CREATED);
    };
  }, [socket, currentUser.username]);

  // Format date for display
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffInHours = (now - date) / 1000 / 60 / 60;
    
    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return `${Math.floor(diffInHours / 24)} days ago`;
    }
  };

  // Create a new commit
  const createCommit = () => {
    if (changedFiles.length === 0) {
      toast.error("No changes to commit");
      return;
    }
    
    if (!commitMessage.trim()) {
      toast.error("Please enter a commit message");
      return;
    }

    setLoading(true);

    // Simulate commit creation
    setTimeout(() => {
      const newCommit = {
        id: `c${Date.now().toString(16)}`,
        message: commitMessage,
        author: currentUser.username,
        timestamp: new Date().toISOString(),
        files: changedFiles.length
      };

      // Add commit to local state
      setCommits((prevCommits) => [newCommit, ...prevCommits]);
      
      // Notify other users
      socket.emit(SocketEvent.COMMIT_CREATED, newCommit);
      
      // Reset state
      setCommitMessage("");
      setChangedFiles([]);
      setLoading(false);
      
      toast.success("Commit created successfully");
    }, 1000);
  };

  // Create a new branch
  const createBranch = () => {
    const branchName = prompt("Enter new branch name:");
    if (!branchName) return;
    
    if (branches.some(branch => branch.name === branchName)) {
      toast.error(`Branch "${branchName}" already exists`);
      return;
    }

    // Add new branch
    setBranches(prevBranches => 
      prevBranches.map(branch => ({ ...branch, current: false }))
        .concat([{ name: branchName, current: true }])
    );

    // Emit branch created event
    socket.emit(SocketEvent.BRANCH_CREATED, { name: branchName });
    
    toast.success(`Created and switched to branch "${branchName}"`);
  };

  // Switch to a different branch
  const switchBranch = (branchName) => {
    setBranches(prevBranches => 
      prevBranches.map(branch => ({
        ...branch,
        current: branch.name === branchName
      }))
    );

    // Emit branch switched event
    socket.emit(SocketEvent.BRANCH_SWITCHED, { name: branchName });
    
    toast.success(`Switched to branch "${branchName}"`);
  };

  return (
    <div
      className="flex max-h-full min-h-[400px] w-full flex-col gap-4 p-4"
      style={{ height: viewHeight }}
    >
      <h1 className="view-title">Version Control</h1>

      {/* Branch Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-md font-medium flex items-center gap-1">
            <LuGitBranch size={16} /> Branches
          </h2>
          <button 
            onClick={createBranch}
            className="text-xs bg-gray-700 hover:bg-gray-600 rounded-md px-2 py-1 flex items-center gap-1"
          >
            <LuGitFork size={14} /> New Branch
          </button>
        </div>
        <ul className="space-y-2">
          {branches.map((branch) => (
            <li
              key={branch.name}
              className={`cursor-pointer rounded-md px-3 py-2 ${
                branch.current ? "bg-primary text-black" : "bg-gray-700 hover:bg-gray-600"
              }`}
              onClick={() => switchBranch(branch.name)}
            >
              {branch.name}
            </li>
          ))}
        </ul>
      </div>

      {/* Changed Files Section */}
      <div>
        <h2 className="text-md font-medium mb-2 flex items-center gap-1">
          <LuGitPullRequest size={16} /> Changed Files
        </h2>
        {changedFiles.length > 0 ? (
          <ul className="space-y-2">
            {changedFiles.map((file) => (
              <li key={file.id} className="border-l-2 border-gray-700 pl-3 py-1">
                <div className="text-sm font-medium flex items-center justify-between">
                  <span>{file.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    file.status === "modified" ? "bg-yellow-600" : "bg-green-600"
                  }`}>
                    {file.status}
                  </span>
                </div>
                <div className="text-xs text-gray-400">{file.changes} changes</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No changed files</p>
        )}
      </div>

      {/* Commit Message Input */}
      <div>
        <textarea
          className="w-full rounded-md border border-gray-700 bg-gray-800 p-2 text-sm text-white"
          placeholder="Enter commit message..."
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
        />
        <button
          className="mt-2 w-full rounded-md bg-primary py-2 text-black disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={createCommit}
          disabled={loading || changedFiles.length === 0}
        >
          {loading ? "Creating Commit..." : "Commit Changes"}
        </button>
      </div>

      {/* Commits Section */}
      <div className="flex-1 overflow-auto">
        <h2 className="text-md font-medium mb-2 flex items-center gap-1">
          <FaGitAlt size={16} /> Commits
        </h2>
        {commits.length > 0 ? (
          <ul className="space-y-2">
            {commits.map((commit) => (
              <li key={commit.id} className="border-l-2 border-gray-700 pl-3 py-1">
                <div className="text-sm font-medium">{commit.message}</div>
                <div className="text-xs text-gray-400 flex justify-between">
                  <span>
                    {commit.id.substring(0, 7)} • {commit.author}
                  </span>
                  <span>{formatDate(commit.timestamp)} • {commit.files} files</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No commits yet</p>
        )}
      </div>

      {/* Actions Section */}
      <div className="pt-2 flex gap-2">
        <button className="flex items-center gap-1 rounded-md bg-gray-700 hover:bg-gray-600 py-2 px-3 text-white flex-1">
          <LuGitPullRequest size={16} /> Pull
        </button>
        <button className="flex items-center gap-1 rounded-md bg-gray-700 hover:bg-gray-600 py-2 px-3 text-white flex-1">
          <LuGitMerge size={16} /> Merge
        </button>
      </div>
    </div>
  );
}

export default VersionControlView;
