import {
    FileSystemItem,
    FileContent,
    FileContext,
    Id,
    FileName,
} from "@/types/file"
import { SocketEvent } from "@/types/socket"
import {
    createContext,
    Dispatch,
    ReactNode,
    SetStateAction,
    useContext,
    useState,
} from "react"
import toast from "react-hot-toast"
import { v4 as uuidv4 } from "uuid"
import {
    findParentDirectory,
    getFileById,
    isFileExist,
    sortFileSystemItem,
} from "@/utils/file"
import { initialFileStructure } from "@/utils/file"
import { useSocket } from "./SocketContext"

interface FileContextProps {
    fileStructure: FileSystemItem
    setFileStructure: Dispatch<SetStateAction<FileSystemItem>>
}

const FileContext = createContext<FileContext | null>(null)

export const useFileSystem = (): FileContext => {
    const context = useContext(FileContext)
    if (!context) {
        throw new Error("useFileSystem must be used within a FileProvider")
    }
    return context
}

export const FileContextProvider = ({ children }: { children: ReactNode }) => {
    const [fileStructure, setFileStructure] =
        useState<FileSystemItem>(initialFileStructure)
    const [openFiles, setOpenFiles] = useState<FileSystemItem[]>([])
    const [activeFile, setActiveFile] = useState<FileSystemItem | null>(null)
    const { socket } = useSocket()

    const toggleDirectory = (dirId: Id) => {
        const updatedStructure = toggleDirectoryState(fileStructure, dirId)
        setFileStructure(updatedStructure)
    }

    const toggleDirectoryState = (
        item: FileSystemItem,
        dirId: Id,
    ): FileSystemItem => {
        if (item.id === dirId && item.type === "directory") {
            return { ...item, isOpen: !item.isOpen }
        }

        if (item.type === "directory" && item.children) {
            return {
                ...item,
                children: item.children.map((child) =>
                    toggleDirectoryState(child, dirId),
                ),
            }
        }

        return item
    }

    const collapseDirectories = () => {
        const updatedStructure = collapseAllDirectories(fileStructure)
        setFileStructure(updatedStructure)
    }

    const collapseAllDirectories = (item: FileSystemItem): FileSystemItem => {
        if (item.type === "directory") {
            item.isOpen = false
            if (item.children) {
                item.children = item.children.map((child) =>
                    collapseAllDirectories(child),
                )
            }
        }
        return item
    }

    const createDirectory = (parentDirId: Id, name: FileName): Id => {
        // Find the parent directory
        const parentDir = findParentDirectory(fileStructure, parentDirId)

        if (!parentDir) {
            toast.error("Parent directory not found")
            console.error("Parent directory not found for ID:", parentDirId)
            return ""
        }

        // Check if directory with the same name already exists
        if (isFileExist(parentDir, name)) {
            toast.error("Directory already exists")
            return ""
        }

        // Create a new directory
        const dirId = uuidv4()
        const newDirectory: FileSystemItem = {
            id: dirId,
            name,
            type: "directory",
            children: [],
        }

        // Update the parent directory
        parentDir.children = [...(parentDir.children || []), newDirectory]
        setFileStructure((prev) => ({ ...prev }))

        // Notify collaborators
        socket.emit(SocketEvent.DIRECTORY_CREATED, {
            parentDirId,
            newDirectory,
        })

        return dirId
    }

    const updateDirectory = (dirId: Id, children: FileSystemItem[]) => {
        const updateDir = (
            item: FileSystemItem,
            dirId: Id,
            children: FileSystemItem[],
        ): FileSystemItem => {
            if (item.id === dirId && item.type === "directory") {
                return { ...item, children }
            }

            if (item.type === "directory" && item.children) {
                return {
                    ...item,
                    children: item.children.map((child) =>
                        updateDir(child, dirId, children),
                    ),
                }
            }

            return item
        }

        const updatedStructure = updateDir(fileStructure, dirId, children)
        setFileStructure(updatedStructure)

        socket.emit(SocketEvent.DIRECTORY_UPDATED, { dirId, children })
    }

    const renameDirectory = (dirId: Id, newName: FileName) => {
        const renameDir = (
            item: FileSystemItem,
            dirId: Id,
            newName: FileName,
        ): FileSystemItem => {
            if (item.id === dirId && item.type === "directory") {
                return { ...item, name: newName }
            }

            if (item.type === "directory" && item.children) {
                return {
                    ...item,
                    children: item.children.map((child) =>
                        renameDir(child, dirId, newName),
                    ),
                }
            }

            return item
        }

        const updatedStructure = renameDir(fileStructure, dirId, newName)
        setFileStructure(updatedStructure)

        socket.emit(SocketEvent.DIRECTORY_RENAMED, { dirId, newName })
    }

    const deleteDirectory = (dirId: Id) => {
        const deleteDir = (
            item: FileSystemItem,
            dirId: Id,
        ): FileSystemItem => {
            if (item.type === "directory" && item.children) {
                return {
                    ...item,
                    children: item.children.filter((child) => child.id !== dirId).map((child) =>
                        deleteDir(child, dirId),
                    ),
                }
            }

            return item
        }

        const updatedStructure = deleteDir(fileStructure, dirId)
        setFileStructure(updatedStructure)

        socket.emit(SocketEvent.DIRECTORY_DELETED, { dirId })
    }

    const createFile = (parentDirId: Id, name: FileName): Id => {
        // Find the parent directory
        const parentDir = findParentDirectory(fileStructure, parentDirId);
        
        // Handle case when parent directory is not found
        if (!parentDir) {
            toast.error("Parent directory not found");
            console.error("Parent directory not found for ID:", parentDirId);
            
            // Return a temporary ID to prevent further errors, but don't create file
            return uuidv4();
        }
        
        // Check if file with the same name already exists
        if (isFileExist(parentDir, name)) {
            toast.error("File already exists");
            return "";
        }
        
        // Create a new file
        const fileId = uuidv4();
        const newFile: FileSystemItem = {
            id: fileId,
            name,
            type: "file",
            content: "",
        };
        
        // Update the parent directory
        parentDir.children = [...(parentDir.children || []), newFile];
        
        setFileStructure((prev) => ({ ...prev }));
        
        // Notify collaborators
        socket.emit(SocketEvent.FILE_CREATED, {
            parentDirId,
            newFile,
        });
        
        return fileId;
    };

    const updateFileContent = (fileId: Id, content: FileContent) => {
        const updateContent = (
            item: FileSystemItem,
            fileId: Id,
            content: FileContent,
        ): FileSystemItem => {
            if (item.id === fileId && item.type === "file") {
                return { ...item, content }
            }

            if (item.type === "directory" && item.children) {
                return {
                    ...item,
                    children: item.children.map((child) =>
                        updateContent(child, fileId, content),
                    ),
                }
            }

            return item
        }

        const updatedStructure = updateContent(fileStructure, fileId, content)
        setFileStructure(updatedStructure)
    }

    const openFile = (fileId: Id) => {
        const file = getFileById(fileStructure, fileId)
        if (!file) {
            toast.error("File not found")
            return
        }

        if (openFiles.some((openFile) => openFile.id === fileId)) {
            setActiveFile(file)
            return
        }

        file.isOpen = true
        setOpenFiles([...openFiles, file])
        setActiveFile(file)
    }

    const closeFile = (fileId: Id) => {
        setOpenFiles(openFiles.filter((file) => file.id !== fileId))
        if (activeFile?.id === fileId) {
            setActiveFile(null)
        }
    }

    const renameFile = (fileId: Id, newName: FileName): boolean => {
        if (!newName.trim()) {
            toast.error("File name cannot be empty")
            return false
        }

        const file = getFileById(fileStructure, fileId)
        if (!file) {
            toast.error("File not found")
            return false
        }

        const parentDir = findParentDirectory(
            fileStructure,
            getParentDirId(fileStructure, fileId),
        )
        if (!parentDir) {
            toast.error("Parent directory not found")
            return false
        }

        if (isFileExist(parentDir, newName)) {
            toast.error("File already exists")
            return false
        }

        const rename = (
            item: FileSystemItem,
            fileId: Id,
            newName: FileName,
        ): FileSystemItem => {
            if (item.id === fileId && item.type === "file") {
                return { ...item, name: newName }
            }

            if (item.type === "directory" && item.children) {
                return {
                    ...item,
                    children: item.children.map((child) =>
                        rename(child, fileId, newName),
                    ),
                }
            }

            return item
        }

        const updatedStructure = rename(fileStructure, fileId, newName)
        setFileStructure(updatedStructure)

        socket.emit(SocketEvent.FILE_RENAMED, { fileId, newName })
        return true
    }

    const deleteFile = (fileId: Id) => {
        const deleteFileFromStructure = (
            item: FileSystemItem,
            fileId: Id,
        ): FileSystemItem => {
            if (item.type === "directory" && item.children) {
                return {
                    ...item,
                    children: item.children.filter((child) => child.id !== fileId).map((child) =>
                        deleteFileFromStructure(child, fileId),
                    ),
                }
            }

            return item
        }

        const updatedStructure = deleteFileFromStructure(fileStructure, fileId)
        setFileStructure(updatedStructure)
        setOpenFiles(openFiles.filter((file) => file.id !== fileId))
        if (activeFile?.id === fileId) {
            setActiveFile(null)
        }

        socket.emit(SocketEvent.FILE_DELETED, { fileId })
    }

    const getParentDirId = (fileStructure: FileSystemItem, fileId: Id): Id => {
        let parentDirId: Id = ""

        const findParent = (item: FileSystemItem, fileId: Id) => {
            if (item.type === "directory" && item.children) {
                item.children.forEach((child) => {
                    if (child.id === fileId) {
                        parentDirId = item.id
                    } else {
                        findParent(child, fileId)
                    }
                })
            }
        }

        findParent(fileStructure, fileId)
        return parentDirId
    }

    const downloadFilesAndFolders = () => {
        const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
            JSON.stringify(fileStructure),
        )}`

        const link = document.createElement("a")
        link.href = jsonString
        link.download = "code-sync-project.json"
        link.click()
    }

    const toggleFileLock = (fileId: Id, username: string) => {
        const toggleLock = (
            item: FileSystemItem,
            fileId: Id,
            username: string,
        ): FileSystemItem => {
            if (item.id === fileId && item.type === "file") {
                const isLocked = !item.isLocked;
                const lockedBy = isLocked ? username : undefined;
                return { ...item, isLocked, lockedBy };
            }
    
            if (item.type === "directory" && item.children) {
                return {
                    ...item,
                    children: item.children.map((child) =>
                        toggleLock(child, fileId, username),
                    ),
                };
            }
    
            return item;
        };
    
        const updatedStructure = toggleLock(fileStructure, fileId, username);
        setFileStructure(updatedStructure);
    
        const file = getFileById(fileStructure, fileId);
        if (file) {
            socket.emit(SocketEvent.FILE_LOCK_TOGGLED, {
                fileId,
                username,
                isLocked: file.isLocked,
            });
        }
    };

    return (
        <FileContext.Provider
            value={{
                fileStructure,
                openFiles,
                activeFile,
                setActiveFile,
                closeFile,
                toggleDirectory,
                collapseDirectories,
                createDirectory,
                updateDirectory,
                renameDirectory,
                deleteDirectory,
                createFile,
                updateFileContent,
                openFile,
                renameFile,
                deleteFile,
                downloadFilesAndFolders,
                toggleFileLock,
            }}
        >
            {children}
        </FileContext.Provider>
    )
}

export { FileContext }
