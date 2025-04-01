
import { ReactNode } from "react"

export enum VIEWS {
    FILES = "Files",
    CLIENTS = "Clients",
    SETTINGS = "Settings",
    CHATS = "Chats",
    COPILOT = "Copilot",
    RUN = "Run",
    VERSION_CONTROL = "Version Control"
}

export type ViewContext = {
    activeView: VIEWS
    setActiveView: (view: VIEWS) => void
    isSidebarOpen: boolean
    setIsSidebarOpen: (isOpen: boolean) => void
    viewComponents: { [key in VIEWS]: ReactNode }
    viewIcons: { [key in VIEWS]: ReactNode }
}
