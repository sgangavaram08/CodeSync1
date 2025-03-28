import { useEffect, useMemo, useState } from "react"
import Particles, { initParticlesEngine } from "@tsparticles/react"

import {
    type Container,
    type ISourceOptions,
    MoveDirection,
    OutMode,
} from "@tsparticles/engine"
import { loadSlim } from "@tsparticles/slim"
import { Link } from "react-router-dom"

const Home = () => {
    const [init, setInit] = useState(false)

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine)
        }).then(() => {
            setInit(true)
        })
    }, [])

    const particlesLoaded = async (container?: Container): Promise<void> => {
        console.log(container)
    }

    const options: ISourceOptions = useMemo(
        () => ({
            background: {
                color: {
                    value: "black",
                },
            },
            fpsLimit: 120,
            interactivity: {
                events: {
                    onClick: {
                        enable: true,
                        mode: "push",
                    },
                    onHover: {
                        enable: true,
                        mode: "repulse",
                    },
                },
                modes: {
                    push: {
                        quantity: 4,
                    },
                    repulse: {
                        distance: 200,
                        duration: 0.4,
                    },
                },
            },
            particles: {
                color: {
                    value: "#ffffff",
                },
                links: {
                    color: "#ffffff",
                    distance: 150,
                    enable: true,
                    opacity: 0.5,
                    width: 1,
                },
                move: {
                    direction: MoveDirection.none,
                    enable: true,
                    outModes: {
                        default: OutMode.out,
                    },
                    random: false,
                    speed: 6,
                    straight: false,
                },
                number: {
                    density: {
                        enable: true,
                    },
                    value: 80,
                },
                opacity: {
                    value: 0.5,
                },
                shape: {
                    type: "circle",
                },
                size: {
                    value: { min: 1, max: 5 },
                },
            },
            detectRetina: true,
        }),
        [],
    )

    if (init) {
        return (
            <div className="relative min-h-screen">
                <Particles
                    id="tsparticles"
                    particlesLoaded={particlesLoaded}
                    options={options}
                    className="absolute left-0 top-0 h-full w-full"
                />
                <div className="relative z-10 flex min-h-screen items-center justify-center bg-transparent text-white">
                    <div className="px-4 text-center md:px-12">
                        <h1 className="mb-4 text-4xl font-bold text-orange-500 md:text-6xl">
                            Welcome to Code Sync
                        </h1>
                        <p className="mb-6 text-lg text-gray-400 md:text-xl">
                            Stay in sync with your code and collaborate
                            effortlessly with your team.
                        </p>

                        <div className="flex justify-center space-x-4">
                            {/* Login Button */}
                            <Link to="/login"><a
                                href="#login"
                                className="inline-block rounded-lg bg-orange-500 px-6 py-3 font-semibold text-black transition-all duration-300 hover:bg-orange-600"
                            >
                                Login
                            </a></Link>

                            {/* Register Button */}
                            <Link to="/register">
                                <a
                                    href="#register"
                                    className="inline-block rounded-lg border-2 border-orange-500 px-6 py-3 font-semibold text-orange-500 transition-all duration-300 hover:bg-orange-500 hover:text-black"
                                >
                                    Register
                                </a>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignContent: "center",
                height: "100vh",
            }}
        >
            <h1>Loading...</h1>
        </div>
    ) // Optionally show a loading state while particles are being initialized
}

export default Home
