import React, { useState } from "react";
import illustration from "@/assets/illustration.svg";
// import FormComponent from "@/components/forms/FormComponent";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

// import Footer from "@/components/common/Footer";

function RegisterPage() {
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
                `http://127.0.0.1:3001/register`,
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
            navigate("/loginpage")
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
        <div className="flex min-h-screen flex-col items-center justify-center gap-16">
            <div className="my-12 flex h-full min-w-full flex-col items-center justify-evenly sm:flex-row sm:pt-0">
                <div className="flex w-full animate-up-down justify-center sm:w-1/2 sm:pl-4">
                    <img
                        src={illustration}
                        alt="Code Sync Illustration"
                        className="mx-auto w-[250px] sm:w-[400px]"
                    />
                </div>
                <div className="flex h-screen w-1/2 items-center justify-center">
                <div className="b-2 w-3/4 rounded-3xl border-green-900 bg-black/50 p-8 text-center backdrop-blur-sm">
                    <h2 className="mb-4 text-3xl text-green-500">Register</h2>
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
                            className="rounded-lg border  border-green-500 bg-transparent p-2 focus:outline-none focus:ring-green-500"
                        />
                        <input
                            type="tel"
                            id="mobile"
                            value={mobile}
                            maxLength={10}
                            onChange={(e) => setMobile(e.target.value)}
                            required
                            placeholder="Mobile Number"
                            className="rounded-lg border border-green-500 bg-transparent p-2 focus:outline-none focus:ring-green-500"
                        />
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Password"
                            className="rounded-lg border border-green-500 bg-transparent p-2 focus:outline-none focus:ring-green-500"
                        />
                        <Link to="/loginpage">
                            <p className="">Already have an account? Login</p>
                        </Link>
                        <button
                            type="submit"
                            className="rounded-lg bg-green-500 px-4 py-2 font-bold text-white hover:bg-green-700"
                        >
                            Register
                        </button>
                    </form>
                </div>
            </div>
            </div>
            {/* Uncomment if you want to include the Footer component */}
            {/* <Footer /> */}
        </div>
    );
}

export default RegisterPage;