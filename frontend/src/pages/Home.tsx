import { Link, useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import { useState } from "react";

function Home() {
  const navigate = useNavigate();

  const [urlValue, setUrlValue] = useState('');

  function goToTestPage() {
    navigate(`/test`, {state: {url:urlValue}});
  }

  return (
    <>
      <div className="p-8 sm:p-16 md:p-20 lg:p-36 flex flex-col h-screen items-center justify-center">
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl mb-8 font-bold font-title text-center">
          Welcome To
        </h1>
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl text-primary font-bold font-title text-center">Automated Detection and Repair Mechanism</h2>
        {/* <img className="w-3/4 lg:w-2/5 my-4 md:my-12 lg:my-12 flex-shrink-0" src="/ReDeFix-Logo.png" /> */}
        <p className="font-body text-sm md:text-lg lg:text-xl text-center my-4">
          Find Your Responsive Webpage Layout Failures and Repair them instantly!
        </p>
        <InputField type={"text"} placeholder={"Enter Your Website URL"} value={urlValue} setValue={setUrlValue}/>
          <button className="w-1/3 md:w-1/4 lg:w-1/5 text-md md:text-xl lg:text-2xl font-title font-bold bg-primary hover:bg-black py-2 text-white rounded-lg"
          onClick={() => goToTestPage()}>
            Start
          </button>
      </div>
    </>
  );
}

export default Home;
