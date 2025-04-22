
import useResponsive from "@/hooks/useResponsive"

function TestGeneratorView() {
    const { viewHeight } = useResponsive()

    return (
        <div
            className="flex max-h-full min-h-[400px] w-full flex-col gap-2 p-4"
            style={{ height: viewHeight }}
        >
            <h1 className="view-title">Test Generator</h1>
            <div className="flex flex-col items-center justify-center h-full">
                <p className="text-lg text-center text-gray-400">
                    Test Generator functionality is temporarily disabled.
                </p>
                <p className="text-md text-center text-gray-500 mt-2">
                    This feature will be available again in a future update.
                </p>
            </div>
        </div>
    )
}

export default TestGeneratorView
