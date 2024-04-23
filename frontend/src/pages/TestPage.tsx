import { useLocation } from "react-router-dom";
import Navbar from "../layouts/Navbar";
import { useState, useEffect } from "react";
import { testUrl } from "../services/test";
import { useNavigate } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";

function parseUrlDomain(url) {
  let name;
  if (url.includes("http://") || url.includes("https://")) {
    name = url.replace(/^https?:\/\//, "");
} else {
    name = url;
}
  return name;
}

export default function TestPage({ socket }) {

  const navigate = useNavigate();

  const [url, setUrl] = useState("");
  const location = useLocation();

  const [step, setStep] = useState(5);

  // extract RLG
  const [completedViewport, setCompletedViewport] = useState(0);
  const [totalViewport, setTotalViewport] = useState(0);
  const [viewportProgress, setViewportProgress] = useState(0);

  // Find RLFs
  const [completedFailures, setCompletedFailures] = useState(0);
  const [totalNode, setTotalNode] = useState(0);
  const [failureProgress, setFailureProgress] = useState(0);

  const [failureNodes, setFailureNodes] = useState(0);

  // Classify RLFs
  const [completedClassify, setCompletedClassify] = useState(0);
  const [totalClassify, setTotalClassify] = useState(0);
  const [classifyProgress, setClassifyProgress] = useState(0);


  // Repair RLFs
  const [completedRepair, setCompletedRepair] = useState(0);
  const [totalRepair, setTotalRepair] = useState(0);
  const [repairProgress, setRepairProgress] = useState(0);
  

  useEffect(() => {
    const parsedUrl = parseUrlDomain(location.state.url);
    setUrl(parsedUrl);
    fetchTestResults(location.state.url);


    // Step 1
    socket.on("Extract RLG", (arg) => {
      setTotalViewport(arg.total);
      setCompletedViewport(arg.counter);
      setViewportProgress(Math.ceil((arg.counter / arg.total) * 100));
    });

    // Step 2
    socket.on("Find RLFs", (arg) => {
      // setStep(2);
      setTotalNode(arg.total);
      setCompletedFailures(arg.counter);
      setFailureProgress(Math.ceil((arg.counter / arg.total) * 100));
    });

    // Step 3
    socket.on("Classify", (arg) => {
      // setStep(3);
      console.log(arg.counter);
      if(arg.total === 0) {
        setFailureNodes(0);
        setClassifyProgress(100);
        setRepairProgress(100);
        setStep(5);
      } else {
      setTotalClassify(arg.total);
      setFailureNodes(arg.total);
      setCompletedClassify(arg.counter);
      setClassifyProgress(Math.ceil((arg.counter / arg.total) * 100));
      }
    });

    // Step 4
    socket.on("Repair RLFs", (arg) => {
      // setStep(4);
      setTotalRepair(arg.total);
      setCompletedRepair(arg.counter);
      if(arg.counter > arg.total) {
        arg.counter = arg.total;
      }
      setRepairProgress(Math.ceil((arg.counter / arg.total) * 100));
      // setStep(5);
      });

  }, [socket]);

  const fetchTestResults = async (url: string) => {
    const response = await testUrl(url);
    console.log(response.data);
  };

  const viewResults = async () => {
    navigate('/result', { state:  { URL: url, failure: failureNodes } });
  }


  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center my-24 px-8 sm:px-12 md:px-16 lg:px-24">
        <h1 className="font-title text-xl lg:text-xl">
          Detecting Failures for <b>{url}</b>
        </h1>
        <div className="mt-8 px-16 sm:px-12 md:px-32 lg:px-48 w-full">
          <div className="my-8">
            <h1 className="font-title text-lg lg:text-xl my-4 font-bold text-primary">Step 1: Extracting DOM</h1>
            <ProgressBar progress={viewportProgress} completed={completedViewport} total={totalViewport} type={"Viewport"} />
          </div>

          { step >= 2 && 
            <div className="my-8">
              <h1 className="font-title text-lg lg:text-xl my-4 font-bold text-primary">Step 2: Finding RLFs</h1>
              <ProgressBar progress={failureProgress} completed={completedFailures} total={totalNode} type={"Failure Detection"} />
            </div>
          }

          { step >= 3 && 
            <div className="my-8">
              <h1 className="font-title text-lg lg:text-xl my-4 font-bold text-primary">Step 3: Classifying RLFs</h1>
              <ProgressBar progress={classifyProgress} completed={completedClassify} total={totalClassify} type={"Classification of RLFs"} />
            </div>
          }

          { step >= 4 && 
            <div className="my-8">
              <h1 className="font-title text-lg lg:text-xl my-4 font-bold text-primary">Step 4: Repairing RLFs</h1>
              <ProgressBar progress={repairProgress} completed={completedRepair} total={totalRepair} type={"Generate Repairs"} />
            </div>
          }
        </div>
        {/* buttons */}
        <div className="flex flex-row justify-center space-x-8">
          { step >= 5 &&
          <button className="purple-button-lg md:w-36 lg:w-56 text-sm md:text-md lg:text-lg" onClick={() => viewResults()}>View Results</button>
          }
          <button className="flex flex-row items-center purple-button-lg md:w-36 lg:w-56 text-sm md:text-md lg:text-lg"
              onClick={() => navigate('/')}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <h2 className="ml-2">Detect Again</h2>
          </button>
        </div>
      </div>
    </>
  );
}
