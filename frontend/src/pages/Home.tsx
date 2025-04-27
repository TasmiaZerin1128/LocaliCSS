import { Link, useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import { useState } from "react";
import { testLocally } from "../services/test";

function Home() {
  const navigate = useNavigate();

  const [urlValue, setUrlValue] = useState('');

  function goToTestPage() {
    navigate(`/test`, {state: {url:urlValue}});
  }

  function startTestLocally() {
    testLocally().then((response) => {
      console.log("Running locally");
    });
  }

  return (
    <>
      <div className="p-8 sm:p-16 md:p-20 lg:p-36 flex flex-col h-screen items-center justify-center">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-bold font-title text-center">
          Welcome To
        </h1>
        <img className="w-3/4 lg:w-2/5 my-4 md:my-12 lg:my-12 flex-shrink-0" src="/Tool-Logo.png" />
        <p className="font-body text-sm md:text-lg lg:text-xl text-center my-4">
          Find Your Responsive Webpage Layout Failures and Repair them instantly!
        </p>
        <InputField type={"text"} placeholder={"Enter Your Website URL"} value={urlValue} setValue={setUrlValue}/>
          <button className="w-1/3 md:w-1/4 lg:w-1/5 text-md md:text-xl lg:text-2xl font-title font-bold bg-primary hover:bg-black py-2 text-white rounded-lg"
          onClick={() => goToTestPage()}>
            Start
          </button>
          <br />
          <button className="w-1/3 md:w-1/4 lg:w-1/5 text-md md:text-xl lg:text-2xl font-title font-bold bg-green-500 hover:bg-black py-2 text-white rounded-lg" onClick={() => startTestLocally()}>
            Test Locally
          </button>
      </div>
    </>
  );
}

export default Home;
