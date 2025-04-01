
import { useState } from "react";
import { LuGitBranch, LuGitPullRequest, LuGitMerge } from "react-icons/lu";
import { FaGitAlt } from "react-icons/fa"; // Replace LuGitCommit with FaGitAlt or another valid icon
import useResponsive from "@/hooks/useResponsive";

function VersionControlView() {
  const { viewHeight } = useResponsive();
  const [branches, setBranches] = useState([
    { name: "main", current: true },
    { name: "develop", current: false },
    { name: "feature/user-auth", current: false }
  ]);
  const [commits] = useState([
    { id: "abc123", message: "Initial commit", author: "User", timestamp: "2 days ago" },
    { id: "def456", message: "Add version control feature", author: "User", timestamp: "1 day ago" },
    { id: "ghi789", message: "Fix styling issues", author: "User", timestamp: "12 hours ago" }
  ]);

  const switchBranch = (branchName: string) => {
    setBranches(branches.map(branch => ({
      ...branch,
      current: branch.name === branchName
    })));
  };

  return (
    <div className="flex flex-col p-4" style={{ height: viewHeight }}>
      <h1 className="view-title flex items-center gap-2">
        <LuGitBranch size={20} /> Version Control
      </h1>

      <div className="mb-4">
        <h2 className="text-md font-medium mb-2 flex items-center gap-1">
          <LuGitBranch size={16} /> Branches
        </h2>
        <ul className="space-y-1">
          {branches.map(branch => (
            <li 
              key={branch.name}
              className={`px-2 py-1 rounded cursor-pointer flex items-center ${
                branch.current ? "bg-primary text-black" : "hover:bg-gray-700"
              }`}
              onClick={() => switchBranch(branch.name)}
            >
              {branch.current && <span className="mr-1">•</span>}
              {branch.name}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-md font-medium mb-2 flex items-center gap-1">
          <FaGitAlt size={16} /> Commits
        </h2>
        <ul className="space-y-2">
          {commits.map(commit => (
            <li key={commit.id} className="border-l-2 border-gray-700 pl-3 py-1">
              <div className="text-sm font-medium">{commit.message}</div>
              <div className="text-xs text-gray-400">
                {commit.id.substring(0, 7)} • {commit.author} • {commit.timestamp}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-4 flex gap-2">
        <button className="flex items-center gap-1 rounded-md bg-primary py-2 px-3 text-black">
          <LuGitPullRequest size={16} /> Pull
        </button>
        <button className="flex items-center gap-1 rounded-md bg-primary py-2 px-3 text-black">
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
