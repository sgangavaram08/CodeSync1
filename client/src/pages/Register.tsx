import axios from "axios"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

function Register() {
    const API = import.meta.env.VITE_API_URL;
    const [username, setUsername] = useState<string>("")
    const [mobile, setMobile] = useState<string>("")
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
            // Send POST request to the backend route using axios

            const response = await axios.post(
                `${API}/register`,
                {
                    username,
                    mobile,
                    password,
                },
            )
            console.log(response.data, "..response data")
            alert(response.data.message)

            // If successful, set success message
            setSuccess("Registration successful!")
            // Clear the form
            setUsername("")
            setMobile("")
            setPassword("")
            navigate("/login")
        } catch (err: any) {
            // Handle errors, e.g., if username already exists
            setError(
                err.response
                    ? err.response.data.message
                    : "Error registering user. Please try again.",
            )
        }
    }

    return (
        <div className="to-orange-1000 flex h-screen items-center justify-center bg-gradient-to-b from-black">
            {/* Left Section: Sample GIF */}

            {/* Right Section: Registration Form */}
            <div className="flex h-screen w-1/2 items-center justify-center">
                <div className="b-2 w-3/4 rounded-3xl border-orange-900 bg-black/50 p-8 text-center backdrop-blur-sm">
                    <h2 className="mb-4 text-3xl text-orange-500">Register</h2>
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
                            type="tel"
                            id="mobile"
                            value={mobile}
                            maxLength={10}
                            onChange={(e) => setMobile(e.target.value)}
                            required
                            placeholder="Mobile Number"
                            className="rounded-lg border border-orange-500 bg-transparent p-2 focus:outline-none focus:ring-orange-500"
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
                        <Link to="/login">
                            <p className="">Already have an account? Login</p>
                        </Link>
                        <button
                            type="submit"
                            className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-white hover:bg-orange-700"
                        >
                            Register
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Register
