import { useCopilot } from "@/context/CopilotContext"
import { useFileSystem } from "@/context/FileContext"
import { useSocket } from "@/context/SocketContext"
import useResponsive from "@/hooks/useResponsive"
import { SocketEvent } from "@/types/socket"
import { useState } from "react"
import toast from "react-hot-toast"
import { LuClipboardCheck, LuCopy } from "react-icons/lu"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"

function TestGeneratorView() {
    const { viewHeight } = useResponsive()
    const { socket } = useSocket()
    const { activeFile, updateFileContent, setActiveFile } = useFileSystem()
    const { generateCode, isRunning } = useCopilot()
    const [testOutput, setTestOutput] = useState("")
    const [testFramework, setTestFramework] = useState("jest")
    const [isGenerating, setIsGenerating] = useState(false)

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
            
            // Use the copilot context to generate tests
            // Mock fetch call for this example - in a real implementation, we would use generateCode
            const response = await fetch("https://api.pollinations.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "system",
                            content: `You are a test case generator for ${testFramework}. Generate comprehensive test cases for the provided code. Only return the code, formatted in Markdown using the appropriate language syntax.`,
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    model: "mistral",
                }),
            })

            const data = await response.json()
            if (data) {
                const testCode = data.choices?.[0]?.message?.content || "// No tests generated"
                setTestOutput(`\`\`\`${testFramework === "jest" ? "javascript" : testFramework}\n${testCode}\n\`\`\``)
                toast.success("Test cases generated successfully")
            }
        } catch (error) {
            console.error("Error generating test cases:", error)
            toast.error("Failed to generate test cases")
            setTestOutput("```\n// Failed to generate test cases\n```")
        } finally {
            setIsGenerating(false)
        }
    }

    // Create a test file from the generated output
    const createTestFile = () => {
        if (!activeFile || !testOutput) return

        const { name, parentId } = activeFile
        const baseName = name.split(".")[0]
        const extension = testFramework === "pytest" ? ".py" : ".test.js"
        const testFileName = `${baseName}${extension}`
        const testContent = testOutput.replace(/```[\w]*\n?/g, "").trim()

        // Create a new test file
        const newTestFile = {
            type: "file",
            name: testFileName,
            parentId,
            content: testContent,
        }

        socket.emit(SocketEvent.FILE_CREATED, newTestFile)
        toast.success(`Test file ${testFileName} created`)
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
                    <button title="Create Test File" onClick={createTestFile}>
                        <LuClipboardCheck size={18} className="cursor-pointer text-white" />
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