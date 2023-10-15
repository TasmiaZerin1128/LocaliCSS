import {Routes, Route} from "react-router-dom";
import Home from "./pages/Home";
import TestPage from "./pages/TestPage";
import { io } from "socket.io-client";
import React, { useState, useEffect } from 'react';

const socket = io("http://localhost:3000", { transports: ['polling'] });

const App = () => {

  useEffect(() => {
    socket.on("connect", () => {
      console.log(socket.id); 
    });

    socket.on("message", (arg) => {
      console.log(arg);
    });

    socket.on("connect_error", (err) => {
      console.log(`connect_error due to ${err.message}`);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => {
      socket.disconnect();
    };
  }, []);


  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/test" element={<TestPage socket={socket}/>} />
      </Routes>
    </>
  )
}

export default App;