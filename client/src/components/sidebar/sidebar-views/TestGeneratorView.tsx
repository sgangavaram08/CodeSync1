
import { useCopilot } from "@/context/CopilotContext"
import { useFileSystem } from "@/context/FileContext"
import { useSocket } from "@/context/SocketContext"
import useResponsive from "@/hooks/useResponsive"
import { SocketEvent } from "@/types/socket"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { LuCheck, LuCopy, LuFolderPlus } from "react-icons/lu"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"

function TestGeneratorView() {
    const { viewHeight } = useResponsive()
    const { socket } = useSocket()
    const { activeFile, fileStructure, updateFileContent, setActiveFile, createDirectory, createFile } = useFileSystem()
    const { isRunning } = useCopilot()
    const [testOutput, setTestOutput] = useState("")
    const [testFramework, setTestFramework] = useState("jest")
    const [isGenerating, setIsGenerating] = useState(false)
    const [testsDirectoryId, setTestsDirectoryId] = useState<string | null>(null)

    // Find or create Tests directory on component mount
    useEffect(() => {
        const findTestsDirectory = () => {
            // Check if Tests directory already exists at the root
            const testsDir = fileStructure.children?.find(item => item.type === "directory" && item.name === "Tests");
            
            if (testsDir) {
                setTestsDirectoryId(testsDir.id);
                console.log("Found existing Tests directory:", testsDir.id);
            } else if (fileStructure.id) {
                // If it doesn't exist, create it
                const newDirId = createDirectory(fileStructure.id, "Tests");
                setTestsDirectoryId(newDirId);
                console.log("Created new Tests directory with ID:", newDirId);
                
                // Notify other clients about the new directory
                if (socket && newDirId) {
                    const newDirectory = fileStructure.children?.find(item => item.id === newDirId);
                    socket.emit(SocketEvent.DIRECTORY_CREATED, {
                        parentDirId: fileStructure.id,
                        newDirectory
                    });
                }
            }
        };
        
        if (fileStructure && fileStructure.children) {
            findTestsDirectory();
        }
    }, [fileStructure, createDirectory, socket]);

    // Generate test cases for the active file
    const generateTestCases = async () => {
        if (!activeFile?.content) {
            toast.error("No file content to generate tests for")
            return
        }

        setIsGenerating(true)
        try {
            // Create a prompt for the test generation
            const prompt = `Generate ${testFramework} test cases for the following code. Include detailed test cases for edge cases, normal cases, and error handling. Return only the test code without explanations:\n\n${activeFile.content}`
            
            console.log("Generating tests with framework:", testFramework);
            console.log("Active file:", activeFile.name);
            
            // Use fetch API directly for reliability
            const response = await fetch("https://api.pollinations.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "system",
                            content: `You are a test case generator for ${testFramework}. Generate comprehensive test cases for the provided code. Only return the code, formatted correctly.`,
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    model: "mistral",
                }),
            })

            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            const data = await response.json()
            console.log("Test generation response:", data);
            
            if (data && data.choices && data.choices[0] && data.choices[0].message) {
                const testCode = data.choices[0].message.content || "// No tests generated"
                setTestOutput(`\`\`\`${testFramework === "jest" ? "javascript" : testFramework}\n${testCode}\n\`\`\``)
                toast.success("Test cases generated successfully")
                
                // Create the test file in the Tests directory
                createTestFile(testCode);
                
                // Emit test generated event
                socket.emit(SocketEvent.TEST_GENERATED, {
                    fileName: activeFile.name,
                    testCode
                });
            } else {
                throw new Error("Invalid response format from API");
            }
        } catch (error) {
            console.error("Error generating test cases:", error)
            toast.error(`Failed to generate test cases: ${error.message}`)
            setTestOutput("```\n// Failed to generate test cases\n```")
        } finally {
            setIsGenerating(false)
        }
    }

    // Create a test file from the generated output
    const createTestFile = (testCode) => {
        if (!activeFile || !testsDirectoryId) {
            toast.error("Could not create test file - active file or Tests directory not found");
            return;
        }

        try {
            const { name } = activeFile;
            const baseName = name.split(".")[0];
            const extension = testFramework === "pytest" ? ".py" : ".test.js";
            const testFileName = `${baseName}${extension}`;
            
            console.log("Creating test file:", testFileName, "in directory:", testsDirectoryId);
            
            // Create a new test file
            const fileId = createFile(testsDirectoryId, testFileName);
            
            if (!fileId) {
                toast.error("Failed to create test file - file ID was not returned");
                return;
            }
            
            // Clean the test code by removing markdown formatting if it exists
            const cleanTestCode = testCode.replace(/```[\w]*\n?/g, "").trim();
            updateFileContent(fileId, cleanTestCode);
            console.log("Test file created with ID:", fileId);

            // Emit file created event
            socket.emit(SocketEvent.FILE_CREATED, {
                parentDirId: testsDirectoryId,
                newFile: {
                    id: fileId,
                    name: testFileName, 
                    type: "file",
                    content: cleanTestCode
                }
            });
            
            toast.success(`Test file ${testFileName} created in Tests folder`);
        } catch (error) {
            console.error("Error creating test file:", error);
            toast.error(`Failed to create test file: ${error.message}`);
        }
    }

    // Copy test output to clipboard
    const copyTestOutput = async () => {
        try {
            const content = testOutput.replace(/```[\w]*\n?/g, "").trim()
            await navigator.clipboard.writeText(content)
            toast.success("Test code copied to clipboard")
        } catch (error) {
            toast.error("Unable to copy test code")
            console.error(error)
        }
    }

    // Create test file manually if needed
    const createTestFile = () => {
        if (!activeFile || !testOutput) {
            toast.error("No test output or active file");
            return;
        }

        const cleanCode = testOutput.replace(/```[\w]*\n?/g, "").trim();
        createTestFile(cleanCode);
    }

    return (
        <div
            className="flex max-h-full min-h-[400px] w-full flex-col gap-2 p-4"
            style={{ height: viewHeight }}
        >
            <h1 className="view-title">Test Generator</h1>
            
            <div className="mb-4 flex items-center gap-2">
                <label htmlFor="framework" className="text-sm">Test Framework:</label>
                <select
                    id="framework"
                    className="rounded-md border-none bg-darkHover p-1 text-white outline-none"
                    value={testFramework}
                    onChange={(e) => setTestFramework(e.target.value)}
                >
                    <option value="jest">Jest</option>
                    <option value="mocha">Mocha</option>
                    <option value="pytest">PyTest</option>
                    <option value="junit">JUnit</option>
                </select>
            </div>

            <button
                className="flex w-full justify-center rounded-md bg-primary p-2 font-bold text-black outline-none disabled:cursor-not-allowed disabled:opacity-50"
                onClick={generateTestCases}
                disabled={isGenerating || !activeFile}
            >
                {isGenerating ? "Generating..." : "Generate Test Cases"}
            </button>

            {testOutput && (
                <div className="flex justify-end gap-4 pt-2">
                    <button title="Copy Test Code" onClick={copyTestOutput}>
                        <LuCopy size={18} className="cursor-pointer text-white" />
                    </button>
                    <button title="Create Test File Manually" onClick={createTestFile}>
                        <LuFolderPlus size={18} className="cursor-pointer text-white" />
                    </button>
                </div>
            )}

            <div className="h-full w-full overflow-y-auto rounded-lg p-0">
                <ReactMarkdown
                    components={{
                        code({ inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "")
                            const language = match ? match[1] : "javascript"

                            return !inline ? (
                                <SyntaxHighlighter
                                    style={dracula}
                                    language={language}
                                    PreTag="pre"
                                    className="!m-0 !h-full !rounded-lg !bg-gray-900 !p-2"
                                >
                                    {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                            ) : (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            )
                        },
                        pre({ children }) {
                            return <pre className="h-full">{children}</pre>
                        },
                    }}
                >
                    {testOutput}
                </ReactMarkdown>
            </div>
        </div>
    )
}

export default TestGeneratorView
