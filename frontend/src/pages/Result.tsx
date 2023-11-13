import Navbar from "../layouts/Navbar";
import { SuccessCard, ErrorCard } from "../components/AlertBar";
import { useState } from "react";
import Details from "../components/Details";

export default function ShowResult({ url }) {
    const [error, setError] = useState(0);

  return (
    <>
      <Navbar />
      <div className="flex flex-col my-12 justify-center items-center">
        <h1 className="font-title text-xl lg:text-2xl font-bold my-8">
          Generated Results
        </h1>
        <h1 className="font-title text-lg">
          Target Webpage: <b>{url}</b>
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
