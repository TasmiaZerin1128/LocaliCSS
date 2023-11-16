import Navbar from "../layouts/Navbar";
import { SuccessCard, ErrorCard } from "../components/AlertBar";
import { useEffect, useState } from "react";
import Details from "../components/Details";
import { useLocation } from "react-router-dom";

export default function ShowResult() {
  const location = useLocation();
  const url = location.state.URL;
  const [error, setError] = useState(0);

  useEffect(() => {
    if (location.state.failure != 0) {
      setError(location.state.failure);
    }
  }, [location.state.failure]);

  return (
    <>
      <Navbar />
      <div className="flex flex-col my-12 justify-center items-center">
        <h1 className="font-title text-xl lg:text-2xl font-bold my-8">
          Generated Results
        </h1>
        <h1 className="font-title text-lg">
          Target Webpage: {url && <b>{url}</b>}
        </h1>
        { error === 0 &&
            <SuccessCard heading={"No Error Found"} description={"The tool found no responsive layout failures in the webpage from 320px - 1400px viewport range. Your webpage is nicely designed!"}/>
        }
        {  error > 0 &&
            <ErrorCard heading={"Error Found"} description={"The tool found responsive layout failures in the webpage from 320px - 1400px viewport range. Your webpage needs some repair for making it responsive!"}/>
        }
        <Details />
      </div>
    </>
  );
}
