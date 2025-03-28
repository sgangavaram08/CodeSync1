import illustration from "@/assets/illustration.svg"
import FormComponent from "@/components/forms/FormComponent"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
// import Footer from "@/components/common/Footer";

function HomePage() {
    const [init, setInit] = useState(false)
    // const navigate = useNavigatee()
    useEffect(() => {
        const user = localStorage.getItem("USER");
        const username = JSON.parse(user).user.name
        console.log(username);
        

        if (username) {
            ("")
        } else {
            // navigate("/login")
        }
    }, [])

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
                <div className="flex w-full items-center justify-center sm:w-1/2">
                    <FormComponent />
                </div>
            </div>
            {/* <Footer /> */}
        </div>
    )
}

export default HomePage
