import {Routes, Route} from "react-router-dom";
import Home from "./pages/Home";
import TestPage from "./pages/TestPage";

export default function App () {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/test" element={<TestPage />} />
      </Routes>
    </>
  )
}