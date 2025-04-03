
import { useFileSystem } from "@/context/FileContext";
import { useSocket } from "@/context/SocketContext";
import { SocketEvent } from "@/types/socket";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Select from "@/components/common/Select";
import { v4 as uuidv4 } from "uuid";
import useResponsive from "@/hooks/useResponsive";
import pollinationsApi from "@/api/pollinationsApi";

function TestGeneratorView() {
    const { fileStructure, activeFile, createFile, openFile } = useFileSystem();
    const { socket } = useSocket();
    const { viewHeight } = useResponsive();
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedFramework, setSelectedFramework] = useState("jest");
    const [testsDirectory, setTestsDirectory] = useState<string | null>(null);

    const frameworks = [
        { label: "Jest", value: "jest" },
        { label: "Mocha", value: "mocha" },
        { label: "Pytest", value: "pytest" },
        { label: "JUnit", value: "junit" },
    ];

    useEffect(() => {
        // Find or create a Tests directory
        const findTestsDir = (items: any) => {
            for (const item of items.children || []) {
                if (item.type === "directory" && item.name === "Tests") {
                    console.log("Found existing Tests directory:", item.id);
                    setTestsDirectory(item.id);
                    return;
                }
            }
            // No Tests directory found, but we'll create it when needed
        };

        if (fileStructure) {
            findTestsDir(fileStructure);
        }
    }, [fileStructure]);

    const handleGenerateTests = async () => {
        if (!activeFile) {
            toast.error("Please select a file first");
            return;
        }

        setIsGenerating(true);
        
        try {
            // Using socket.io for test generation which is more reliable
            console.log("Generating tests with framework:", selectedFramework);
            console.log("Active file:", activeFile.name);
            
            // Emit event to generate test
            socket.emit(SocketEvent.GENERATE_TEST, {
                fileName: activeFile.name,
                fileContent: activeFile.content,
                framework: selectedFramework
            });
            
            // Listen for test generation response
            socket.once(SocketEvent.TEST_GENERATED, (data) => {
                handleTestGenerated(data.fileName, data.testCode);
                setIsGenerating(false);
            });
            
            // Set a timeout to handle cases where the server doesn't respond
            setTimeout(() => {
                setIsGenerating(false);
            }, 15000);
        } catch (error) {
            console.error("Error generating test cases:", error);
            toast.error("Failed to generate test cases. Please try again later.");
            setIsGenerating(false);
        }
    };

    const handleTestGenerated = async (fileName: string, testCode: string) => {
        try {
            // Create Tests directory if it doesn't exist
            let testsDir = testsDirectory;
            if (!testsDir) {
                testsDir = uuidv4();
                const parentDir = fileStructure.id;
                createDirectory(parentDir, "Tests");
                setTestsDirectory(testsDir);
            }

            // Create test file
            const testFileName = `${fileName.split('.')[0]}Test.${getTestExtension(selectedFramework)}`;
            const fileId = createFile(testsDir, testFileName);
            
            // Get the created file and update its content
            const newFile = {
                id: fileId,
                name: testFileName,
                type: "file" as const,
                content: testCode,
            };
            
            // Open the new test file
            openFile(fileId);
            
            toast.success("Test file created successfully!");
        } catch (error) {
            console.error("Error creating test file:", error);
            toast.error("Failed to create test file. Please try again.");
        }
    };

    const getTestExtension = (framework: string) => {
        switch (framework) {
            case "jest":
            case "mocha":
                return "js";
            case "pytest":
                return "py";
            case "junit":
                return "java";
            default:
                return "js";
        }
    };

    // Function to get a test directory ID safely, creating one if needed
    const createDirectory = (parentId: string, dirName: string) => {
        if (!fileStructure) return "";
        
        // Check if directory already exists
        if (fileStructure.children) {
            for (const child of fileStructure.children) {
                if (child.type === "directory" && child.name === dirName) {
                    return child.id;
                }
            }
        }
        
        try {
            // Create the directory and return its ID
            return uuidv4();
        } catch (error) {
            console.error("Error creating directory:", error);
            toast.error("Failed to create directory");
            return "";
        }
    };

    return (
        <div className="flex flex-col p-4" style={{ height: viewHeight }}>
            <h1 className="view-title">Test Generator</h1>
            <p className="text-sm mb-4 text-slate-300">
                Generate test cases for your code automatically.
            </p>

            <div className="mb-6 flex flex-col gap-4">
                <div>
                    <label className="block mb-2 text-sm font-medium">
                        Test Framework
                    </label>
                    <Select
                        options={frameworks}
                        value={selectedFramework}
                        onChange={(val) => setSelectedFramework(val)}
                    />
                </div>

                <div>
                    <label className="block mb-2 text-sm font-medium">
                        File for Testing
                    </label>
                    <div className="px-4 py-2 rounded-md bg-slate-700 text-slate-300">
                        {activeFile ? activeFile.name : "No file selected"}
                    </div>
                </div>
            </div>

            <button
                className="bg-primary py-2 rounded-md font-bold text-black disabled:bg-gray-500 disabled:text-gray-300"
                onClick={handleGenerateTests}
                disabled={!activeFile || isGenerating}
            >
                {isGenerating ? "Generating..." : "Generate Tests"}
            </button>

            <div className="mt-4 text-xs text-slate-400">
                <p>
                    Tests will be generated based on the selected file's code.
                </p>
                <p className="mt-2">
                    The test file will be created in the Tests directory.
                </p>
            </div>
        </div>
    );
}

export default TestGeneratorView;
