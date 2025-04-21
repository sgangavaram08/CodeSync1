
import { useState, useEffect } from "react";
import { LuGitBranch, LuGitPullRequest, LuGitMerge, LuGitFork } from "react-icons/lu";
import { FaGitAlt } from "react-icons/fa";
import useResponsive from "@/hooks/useResponsive";
import { useFileSystem } from "@/context/FileContext";
import { useSocket } from "@/context/SocketContext";
import { useAppContext } from "@/context/AppContext";
import { SocketEvent } from "@/types/socket";
import toast from "react-hot-toast";
import { supabase } from "../../../integrations/supabase/client";

function VersionControlView() {
  const { viewHeight } = useResponsive();
  const { fileStructure, activeFile, updateFileContent, setActiveFile } = useFileSystem();
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
  const [mergeInProgress, setMergeInProgress] = useState(false);
  const [pullInProgress, setPullInProgress] = useState(false);
  const [selectedBranchForMerge, setSelectedBranchForMerge] = useState('');

  // Load branches and commits from the database when the component mounts
  useEffect(() => {
    if (currentUser.roomId) {
      loadBranchesFromDatabase(currentUser.roomId);
      loadCommitsFromDatabase(currentUser.roomId);
    }
  }, [currentUser.roomId]);

  // Load branches from the database for the current room
  const loadBranchesFromDatabase = async (roomId) => {
    try {
      const { data, error } = await supabase
        .from('version_control_branches')
        .select('*')
        .eq('room_id', roomId);
      
      if (error) {
        console.error('Error loading branches:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const formattedBranches = data.map(branch => ({
          name: branch.name,
          current: branch.is_current
        }));
        setBranches(formattedBranches);
      } else {
        // If no branches found for this room, create default branch in database
        const defaultBranch = { name: "main", current: true };
        await supabase.from('version_control_branches').insert({
          room_id: roomId,
          name: defaultBranch.name,
          is_current: defaultBranch.current,
          created_by: currentUser.username
        });
      }
    } catch (error) {
      console.error('Error in loadBranchesFromDatabase:', error);
    }
  };

  // Load commits from the database for the current room
  const loadCommitsFromDatabase = async (roomId) => {
    try {
      const { data, error } = await supabase
        .from('version_control_commits')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading commits:', error);
        return;
      }
      
      if (data) {
        const formattedCommits = data.map(commit => ({
          id: commit.id,
          message: commit.message,
          author: commit.author,
          timestamp: commit.created_at,
          files: commit.files_count
        }));
        setCommits(formattedCommits);
      }
    } catch (error) {
      console.error('Error in loadCommitsFromDatabase:', error);
    }
  };

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

  // Create a new commit and save to database
  const createCommit = async () => {
    if (changedFiles.length === 0) {
      toast.error("No changes to commit");
      return;
    }
    
    if (!commitMessage.trim()) {
      toast.error("Please enter a commit message");
      return;
    }

    setLoading(true);

    try {
      const newCommit = {
        id: `c${Date.now().toString(16)}`,
        message: commitMessage,
        author: currentUser.username,
        timestamp: new Date().toISOString(),
        files: changedFiles.length
      };

      // Save commit to database
      const { data, error } = await supabase.from('version_control_commits').insert({
        id: newCommit.id,
        room_id: currentUser.roomId,
        message: newCommit.message,
        author: newCommit.author,
        files_count: newCommit.files,
        branch: branches.find(b => b.current)?.name || 'main'
      });

      if (error) {
        console.error('Error saving commit:', error);
        toast.error('Failed to save commit to database');
        setLoading(false);
        return;
      }

      // Add commit to local state
      setCommits((prevCommits) => [newCommit, ...prevCommits]);
      
      // Notify other users
      socket.emit(SocketEvent.COMMIT_CREATED, newCommit);
      
      // Reset state
      setCommitMessage("");
      setChangedFiles([]);
      
      toast.success("Commit created successfully");
    } catch (error) {
      console.error('Error in createCommit:', error);
      toast.error('Failed to create commit');
    } finally {
      setLoading(false);
    }
  };

  // Create a new branch and save to database
  const createBranch = async () => {
    const branchName = prompt("Enter new branch name:");
    if (!branchName) return;
    
    if (branches.some(branch => branch.name === branchName)) {
      toast.error(`Branch "${branchName}" already exists`);
      return;
    }

    try {
      // Update all current branches to not current in database
      await supabase
        .from('version_control_branches')
        .update({ is_current: false })
        .eq('room_id', currentUser.roomId);

      // Insert new branch as current
      const { error } = await supabase.from('version_control_branches').insert({
        room_id: currentUser.roomId,
        name: branchName,
        is_current: true,
        created_by: currentUser.username
      });

      if (error) {
        console.error('Error creating branch:', error);
        toast.error('Failed to create branch in database');
        return;
      }

      // Add new branch to local state
      setBranches(prevBranches => 
        prevBranches.map(branch => ({ ...branch, current: false }))
          .concat([{ name: branchName, current: true }])
      );

      // Emit branch created event
      socket.emit(SocketEvent.BRANCH_CREATED, { name: branchName });
      
      toast.success(`Created and switched to branch "${branchName}"`);
    } catch (error) {
      console.error('Error in createBranch:', error);
      toast.error('Failed to create branch');
    }
  };

  // Switch to a different branch and update in database
  const switchBranch = async (branchName) => {
    try {
      // Update all branches to not current
      await supabase
        .from('version_control_branches')
        .update({ is_current: false })
        .eq('room_id', currentUser.roomId);

      // Update selected branch to current
      const { error } = await supabase
        .from('version_control_branches')
        .update({ is_current: true })
        .eq('room_id', currentUser.roomId)
        .eq('name', branchName);

      if (error) {
        console.error('Error switching branch:', error);
        toast.error('Failed to switch branch in database');
        return;
      }

      // Update local state
      setBranches(prevBranches => 
        prevBranches.map(branch => ({
          ...branch,
          current: branch.name === branchName
        }))
      );

      // Emit branch switched event
      socket.emit(SocketEvent.BRANCH_SWITCHED, { name: branchName });
      
      toast.success(`Switched to branch "${branchName}"`);
    } catch (error) {
      console.error('Error in switchBranch:', error);
      toast.error('Failed to switch branch');
    }
  };
  
  // Pull code from remote (simulated)
  const pullCode = () => {
    setPullInProgress(true);
    
    // Simulate network delay
    setTimeout(() => {
      // Simulate getting updates from remote
      const currentBranch = branches.find(branch => branch.current);
      if (!currentBranch) {
        toast.error("No active branch found");
        setPullInProgress(false);
        return;
      }
      
      // Simulate pulling changes
      toast.success(`Pulled latest changes from ${currentBranch.name}`);
      
      // Notify other users
      socket.emit(SocketEvent.PULL_CODE, { 
        branch: currentBranch.name,
        by: currentUser.username
      });
      
      // Update file structure randomly as example
      if (fileStructure && fileStructure.children && fileStructure.children.length > 0) {
        // Select a random file
        const randomFileIndex = Math.floor(Math.random() * fileStructure.children.length);
        const randomFile = fileStructure.children.find(item => item.type === "file");
        
        if (randomFile && randomFile.content) {
          // Update the file with a comment indicating the pull
          const updatedContent = randomFile.content + `\n\n// Changes pulled from ${currentBranch.name} by ${currentUser.username}`;
          
          updateFileContent(randomFile.id, updatedContent);
          
          // Update active file if it's the same one
          if (activeFile && activeFile.id === randomFile.id) {
            setActiveFile({ ...activeFile, content: updatedContent });
          }
          
          // Emit the file updated event
          socket.emit(SocketEvent.FILE_UPDATED, {
            fileId: randomFile.id,
            newContent: updatedContent
          });
        }
      }
      
      setPullInProgress(false);
    }, 2000);
  };
  
  // Merge branches (simulated with database update)
  const mergeBranches = async () => {
    // Get current branch
    const currentBranch = branches.find(branch => branch.current);
    if (!currentBranch) {
      toast.error("No active branch found");
      return;
    }
    
    // Show merge selection dialog
    const branchToMerge = prompt(
      `Select a branch to merge into ${currentBranch.name}:\n${
        branches.filter(b => !b.current).map(b => b.name).join("\n")
      }`
    );
    
    if (!branchToMerge) return;
    
    // Validate selection
    if (!branches.some(b => b.name === branchToMerge)) {
      toast.error(`Branch "${branchToMerge}" does not exist`);
      return;
    }
    
    if (branchToMerge === currentBranch.name) {
      toast.error("Cannot merge a branch into itself");
      return;
    }
    
    setMergeInProgress(true);
    setSelectedBranchForMerge(branchToMerge);
    
    // Simulate merge process
    setTimeout(async () => {
      // Simulate potential conflicts
      const hasConflicts = Math.random() > 0.7;
      
      if (hasConflicts) {
        toast.error(`Merge conflict detected between ${currentBranch.name} and ${branchToMerge}`);
        
        // Simulate conflict resolution by updating a file with conflict markers
        if (fileStructure && fileStructure.children) {
          const conflictFile = fileStructure.children.find(item => item.type === "file");
          
          if (conflictFile) {
            const conflictContent = `
<<<<<<< HEAD (${currentBranch.name})
// This is the content from the current branch
function currentFeature() {
  console.log("Feature from current branch");
}
=======
// This is the content from the branch being merged
function incomingFeature() {
  console.log("Feature from incoming branch");
}
>>>>>>> ${branchToMerge}
`;
            updateFileContent(conflictFile.id, conflictContent);
            
            // Update active file if it's the same one
            if (activeFile && activeFile.id === conflictFile.id) {
              setActiveFile({ ...activeFile, content: conflictContent });
            }
            
            // Emit the file updated event
            socket.emit(SocketEvent.FILE_UPDATED, {
              fileId: conflictFile.id,
              newContent: conflictContent
            });
          }
        }
      } else {
        // Successful merge
        toast.success(`Successfully merged ${branchToMerge} into ${currentBranch.name}`);
        
        try {
          // Create a merge commit
          const mergeCommit = {
            id: `merge_${Date.now().toString(16)}`,
            message: `Merge branch '${branchToMerge}' into ${currentBranch.name}`,
            author: currentUser.username,
            timestamp: new Date().toISOString(),
            files: Math.floor(Math.random() * 5) + 1
          };
          
          // Save merge commit to database
          const { error } = await supabase.from('version_control_commits').insert({
            id: mergeCommit.id,
            room_id: currentUser.roomId,
            message: mergeCommit.message,
            author: mergeCommit.author,
            files_count: mergeCommit.files,
            branch: currentBranch.name,
            merge_source: branchToMerge
          });
          
          if (error) {
            console.error('Error saving merge commit:', error);
            toast.error('Failed to save merge commit to database');
          } else {
            // Add commit to local state
            setCommits((prevCommits) => [mergeCommit, ...prevCommits]);
            
            // Notify other users
            socket.emit(SocketEvent.COMMIT_CREATED, mergeCommit);
            socket.emit(SocketEvent.MERGE_BRANCHES, {
              from: branchToMerge,
              to: currentBranch.name,
              by: currentUser.username,
              successful: true
            });
          }
        } catch (error) {
          console.error('Error in mergeBranches:', error);
          toast.error('Failed to create merge commit');
        }
      }
      
      setMergeInProgress(false);
      setSelectedBranchForMerge('');
    }, 3000);
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
        <button 
          className="flex items-center gap-1 rounded-md bg-gray-700 hover:bg-gray-600 py-2 px-3 text-white flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={pullCode}
          disabled={pullInProgress}
        >
          <LuGitPullRequest size={16} /> 
          {pullInProgress ? "Pulling..." : "Pull"}
        </button>
        <button 
          className="flex items-center gap-1 rounded-md bg-gray-700 hover:bg-gray-600 py-2 px-3 text-white flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={mergeBranches}
          disabled={mergeInProgress}
        >
          <LuGitMerge size={16} /> 
          {mergeInProgress ? `Merging ${selectedBranchForMerge}...` : "Merge"}
        </button>
      </div>
    </div>
  );
}

export default VersionControlView;
