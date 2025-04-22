import { useCopilot } from "@/context/CopilotContext"
import { useFileSystem } from "@/context/FileContext"
import { useSocket } from "@/context/SocketContext"
import { useViews } from "@/context/ViewContext" 
import useResponsive from "@/hooks/useResponsive"
import { SocketEvent } from "@/types/socket"
import { VIEWS } from "@/types/view"
import toast from "react-hot-toast"
import { LuClipboardPaste, LuCopy, LuRepeat, LuTestTube } from "react-icons/lu"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"

function CopilotView() {
    const {socket} = useSocket()
    const { viewHeight } = useResponsive()
    const { generateCode, output, isRunning, setInput } = useCopilot()
    const { activeFile, updateFileContent, setActiveFile } = useFileSystem()
    const { setActiveView } = useViews()

    const copyOutput = async () => {
        try {
            const content = output.replace(/```[\w]*\n?/g, "").trim()
            await navigator.clipboard.writeText(content)
            toast.success("Output copied to clipboard")
        } catch (error) {
            toast.error("Unable to copy output to clipboard")
            console.log(error)
        }
    }

    const pasteCodeInFile = () => {
        if (activeFile) {
            const fileContent = activeFile.content
                ? `${activeFile.content}\n`
                : ""
            const content = `${fileContent}${output.replace(/```[\w]*\n?/g, "").trim()}`
            updateFileContent(activeFile.id, content)
            // Update the content of the active file if it's the same file
            setActiveFile({ ...activeFile, content })
            toast.success("Code pasted successfully")
            // Emit the FILE_UPDATED event to the server
            socket.emit(SocketEvent.FILE_UPDATED, {
                fileId: activeFile.id,
                newContent: content,
            })
        }
    }

    const replaceCodeInFile = () => {
        if (activeFile) {
            const isConfirmed = confirm(
                `Are you sure you want to replace the code in the file?`,
            )
            if (!isConfirmed) return
            const content = output.replace(/```[\w]*\n?/g, "").trim()
            updateFileContent(activeFile.id, content)
            // Update the content of the active file if it's the same file
            setActiveFile({ ...activeFile, content })
            toast.success("Code replaced successfully")
            // Emit the FILE_UPDATED event to the server
            socket.emit(SocketEvent.FILE_UPDATED, {
                fileId: activeFile.id,
                newContent: content,
            })
        }
    }
    
    /* Temporarily commenting out test generator functionality */
    const goToTestGenerator = () => {
        if (!activeFile) {
            toast.error("Please open a file first to generate tests")
            return;
        }
        setActiveView(VIEWS.TEST_GENERATOR);
        toast.success("Switched to test generator view");
    }
    

    return (
        <div
            className="flex max-h-full min-h-[400px] w-full flex-col gap-2 p-4"
            style={{ height: viewHeight }}
        >
            <h1 className="view-title">CognIQ</h1>
            <textarea
                className="min-h-[120px] w-full rounded-md border-none bg-darkHover p-2 text-white outline-none"
                placeholder="What code do you want to generate?"
                onChange={(e) => setInput(e.target.value)}
            />
            <div className="flex gap-2">
                <button
                    className="mt-1 flex flex-grow justify-center rounded-md bg-primary p-2 font-bold text-black outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={generateCode}
                    disabled={isRunning}
                >
                    {isRunning ? "Generating..." : "Generate Code"}
                </button>
                
                {/* Temporarily commenting out test generator button */}
                <button
                    className="mt-1 flex justify-center rounded-md bg-emerald-600 p-2 font-bold text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={goToTestGenerator}
                    title="Generate test cases for current file"
                >
                    <LuTestTube size={20} />
                </button>
                
            </div>
            {output && (
                <div className="flex justify-end gap-4 pt-2">
                    <button title="Copy Output" onClick={copyOutput}>
                        <LuCopy
                            size={18}
                            className="cursor-pointer text-white"
                        />
                    </button>
                    <button
                        title="Replace code in file"
                        onClick={replaceCodeInFile}
                    >
                        <LuRepeat
                            size={18}
                            className="cursor-pointer text-white"
                        />
                    </button>
                    <button
                        title="Paste code in file"
                        onClick={pasteCodeInFile}
                    >
                        <LuClipboardPaste
                            size={18}
                            className="cursor-pointer text-white"
                        />
                    </button>
                </div>
            )}
            <div className="h-full rounded-lg w-full overflow-y-auto p-0">
                <ReactMarkdown
                    components={{
                        code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
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
                    {output}
                </ReactMarkdown>
            </div>
        </div>
    )
}

export default CopilotView
