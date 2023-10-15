export default function ProgressBar({progress, completed, total, type}) {
    const widthStyle = {
        width: `${progress}%`,
        transition: 'width 0.5s ease',
      }
    
    return (
        <div className="flex justify-start mb-1 items-center space-x-8">
            <div className="w-1/2 sm:w-3/5 md:w-3/5 lg:w-3/5 bg-[#E4E2E4] rounded-full h-4">
                <div className="bg-primary h-4 rounded-full" style={widthStyle}></div>
            </div>
            <span className="text-md lg:text-lg font-medium text-primary">
                {progress}% | {type} Completed {completed}/{total}
            </span>
        </div>
      )
}
