import { useAppContext } from "@/context/AppContext"
import axios from "axios"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

function Login() {
    const API = import.meta.env.VITE_API_URL;
    const [username, setUsername] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const [error, setError] = useState<string>("")
    const [success, setSuccess] = useState<string>("")
    const navigate = useNavigate()
    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Reset error and success messages
        setError("")
        setSuccess("")

        try {
            // Send POST request to the login route using axios
            const response = await axios.post(`${API}/login`, {
                username,
                password,
            })
            alert(response.data.message)
            // If login is successful, show success message
            setSuccess("Login successful!")
            // Clear form fields
            setUsername("")
            setPassword("")
            if (username) {
                // Store the username in localStorage
                localStorage.setItem("username", username)
                navigate("/createRoom")
            } else {
                navigate("/login")
            }
        } catch (err: any) {
            // Handle errors, such as incorrect username or password
            setError(err.response?.data?.message || "An error occurred")
        }
    }

    return (
        <div className="to-orange-1000 flex h-screen items-center justify-center bg-gradient-to-b from-black">
            {/* Left Section: Sample GIF */}

            {/* Right Section: Registration Form */}
            <div className="flex h-screen w-1/2 items-center justify-center">
                <div className="b-2 w-3/4 rounded-3xl border-orange-900 bg-black/50 p-8 text-center backdrop-blur-sm">
                    <h2 className="mb-4 text-3xl text-orange-500">Login</h2>
                    {/* Show success message */}
                    {success && <div style={{ color: "green" }}>{success}</div>}

                    {/* Show error message */}
                    {error && <div style={{ color: "red" }}>{error}</div>}
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={handleSubmit}
                    >
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="Username"
                            className="rounded-lg border  border-orange-500 bg-transparent p-2 focus:outline-none focus:ring-orange-500"
                        />
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Password"
                            className="rounded-lg border border-orange-500 bg-transparent p-2 focus:outline-none focus:ring-orange-500"
                        />
                        <Link to="/register">
                            <p className="">Don't have an account? Register</p>
                        </Link>
                        <button
                            type="submit"
                            className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-white hover:bg-orange-700"
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Login
