export default function InputField ({type, placeholder, value, setValue}) {
    return (
        <input
          className="w-3/4 md:w-3/5 lg:w-1/2 my-8 md:my-12 lg:my-16 bg-gray-50 appearance-none placeholder:text-gray-400 border-2 border-primary rounded-lg py-2 px-4 text-black text-sm md:text-lg lg:text-lg focus:outline-none focus:bg-white focus:border-primary"
          id="inline-full-name"
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
        </input>
    )
}