
import { useState, useEffect } from "react";
import { LuGitBranch, LuGitPullRequest, LuGitMerge } from "react-icons/lu";
import { FaGitAlt } from "react-icons/fa";
import useResponsive from "@/hooks/useResponsive";
import toast from "react-hot-toast";

function VersionControlView() {
  const { viewHeight } = useResponsive();

  // State for branches, commits, changed files, and commit message
  const [branches, setBranches] = useState([
    { name: "main", current: true },
    { name: "develop", current: false },
    { name: "feature/user-auth", current: false },
  ]);

  const [commits, setCommits] = useState([
    { id: "abc123", message: "Initial commit", author: "User", timestamp: "2 days ago" },
    { id: "def456", message: "Add version control feature", author: "User", timestamp: "1 day ago" },
    { id: "ghi789", message: "Fix styling issues", author: "User", timestamp: "12 hours ago" },
  ]);

  const [changedFiles, setChangedFiles] = useState<{ id: string; name: string; status: string; changes: number }[]>([]);
  const [commitMessage, setCommitMessage] = useState("");

  // Simulate fetching changed files data
  useEffect(() => {
    const mockFiles = [
      { id: "1", name: "index.html" },
      { id: "2", name: "style.css" },
      { id: "3", name: "app.js" },
    ];

    const mockChangedFiles = mockFiles.map((file) => ({
      id: file.id,
      name: file.name,
      status: Math.random() > 0.5 ? "modified" : "added",
      changes: Math.floor(Math.random() * 20) + 1,
    }));

    setChangedFiles(mockChangedFiles);
  }, []);

  // Create a new commit
  const createCommit = () => {
    if (!commitMessage.trim()) {
      toast.error("Please enter a commit message");
      return;
    }

    const newCommit = {
      id: `c${commits.length + 1}`,
      message: commitMessage,
      author: "Current User",
      timestamp: new Date().toISOString(),
    };

    setCommits((prevCommits) => [newCommit, ...prevCommits]);
    setCommitMessage("");
    toast.success("Commit created successfully");
  };

  return (
    <div
      className="flex max-h-full min-h-[400px] w-full flex-col gap-4 p-4"
      style={{ height: viewHeight }}
    >
      <h1 className="view-title">Version Control</h1>

      {/* Branches Section */}
      <div>
        <h2 className="text-md font-medium mb-2 flex items-center gap-1">
          <LuGitBranch size={16} /> Branches
        </h2>
        <ul className="space-y-2">
          {branches.map((branch) => (
            <li
              key={branch.name}
              className={`cursor-pointer rounded-md px-3 py-2 ${
                branch.current ? "bg-primary text-black" : "bg-gray-700"
              }`}
              onClick={() =>
                setBranches((prevBranches) =>
                  prevBranches.map((b) => ({
                    ...b,
                    current: b.name === branch.name,
                  }))
                )
              }
            >
              {branch.name}
            </li>
          ))}
        </ul>
      </div>

      {/* Commits Section */}
      <div>
        <h2 className="text-md font-medium mb-2 flex items-center gap-1">
          <FaGitAlt size={16} /> Commits
        </h2>
        <ul className="space-y-2">
          {commits.map((commit) => (
            <li key={commit.id} className="border-l-2 border-gray-700 pl-3 py-1">
              <div className="text-sm font-medium">{commit.message}</div>
              <div className="text-xs text-gray-400">
                {commit.id.substring(0, 7)} • {commit.author} • {commit.timestamp}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Changed Files Section */}
      <div>
        <h2 className="text-md font-medium mb-2 flex items-center gap-1">
          <LuGitPullRequest size={16} /> Changed Files
        </h2>
        <ul className="space-y-2">
          {changedFiles.map((file) => (
            <li key={file.id} className="border-l-2 border-gray-700 pl-3 py-1">
              <div className="text-sm font-medium">
                {file.name} ({file.status})
              </div>
              <div className="text-xs text-gray-400">{file.changes} changes</div>
            </li>
          ))}
        </ul>
      </div>

      {/* Commit Message Input */}
      <div className="mt-4">
        <textarea
          className="w-full rounded-md border border-gray-700 bg-gray-800 p-2 text-sm text-white"
          placeholder="Enter commit message..."
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
        />
        <button
          className="mt-2 w-full rounded-md bg-primary py-2 text-black"
          onClick={createCommit}
        >
          Commit Changes
        </button>
      </div>

      {/* Actions Section */}
      <div className="mt-auto pt-4 flex gap-2">
        <button className="flex items-center gap-1 rounded-md bg-primary py-2 px-3 text-black">
          <LuGitPullRequest size={16} /> Pull
        </button>
        <button
          className="flex items-center gap-1 rounded-md bg-primary py-2 px-3 text-black"
          onClick={createCommit}
        >
          <FaGitAlt size={16} /> Commit
        </button>
        <button className="flex items-center gap-1 rounded-md bg-gray-700 py-2 px-3">
          <LuGitMerge size={16} /> Merge
        </button>
      </div>
    </div>
  );
}

export default VersionControlView;
