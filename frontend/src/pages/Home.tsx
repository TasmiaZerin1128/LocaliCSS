function Home() {
  return (
    <>
      <div className="p-8 sm:p-16 md:p-20 lg:p-36 flex flex-col h-screen items-center justify-center">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-bold font-title text-center">
          Welcome To
        </h1>
        <img className="w-3/4 lg:w-2/5 my-4 md:my-12 lg:my-12 flex-shrink-0" src="/ReDeFix-Logo.png" />
        <p className="font-body text-sm md:text-lg lg:text-xl text-center my-4">
          Find Your Responsive Webpage Layout Failures and Repair them instantly!
        </p>
        <input
          className="w-3/4 md:w-3/5 lg:w-1/2 my-8 md:my-12 lg:my-16 bg-gray-100 appearance-none border-2 border-primary rounded-lg py-2 px-4 text-black text-sm md:text-lg lg:text-lg focus:outline-none focus:bg-white focus:border-primary"
          id="inline-full-name"
          type="text"
          placeholder="Enter Your Website URL"
        ></input>
        <button className="w-1/3 md:w-1/4 lg:w-1/5 text-md md:text-xl lg:text-2xl font-title font-bold bg-primary hover:bg-black py-2 text-white rounded-lg">
          Start
        </button>
      </div>
    </>
  );
}

export default Home;
