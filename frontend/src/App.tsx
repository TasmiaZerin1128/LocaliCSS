import {Routes, Route} from "react-router-dom";
import Home from "./pages/Home";
import TestPage from "./pages/TestPage";
import io from 'socket.io-client';

const socket = io.connect('http://localhost:3000');

export default function App () {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/test" element={<TestPage socket={socket}/>} />
      </Routes>
    </>
  )
}