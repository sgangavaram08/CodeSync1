import { Route, BrowserRouter as Router, Routes } from "react-router-dom"
// import GitHubCorner from "./components/GitHubCorner"
import Toast from "./components/toast/Toast"
import EditorPage from "./pages/EditorPage"
import HomePage from "./pages/HomePage"
import RegisterPage from "./components/auth/RegisterForm"
import LoginPage from "./components/auth/LoginPage"
import Home from "./components/auth/Home"

const App = () => {
    return (
        <>
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/loginpage" element={<LoginPage />} />
                    <Route path="/createRoom" element={<HomePage />} />
                    <Route path="/editor/:roomId" element={<EditorPage />} />
                </Routes>
            </Router>
            <Toast /> {/* Toast component from react-hot-toast */}
            {/* <GitHubCorner /> */}
        </>
    )
}

export default App
