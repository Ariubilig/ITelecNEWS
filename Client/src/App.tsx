import './App.css'

import { Routes, Route } from "react-router-dom";

import Home from "./pages/home/Home";
import Second from "./pages/second/Second";

import Navbar from "./components/UI/navbar/Navbar";


function App() {

  

  return (
    <>

    <Navbar />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/second" element={<Second />} />
      
      {/* <Route path="*" element={<NotFound />} /> */}
    </Routes>


    </>
  )

}


export default App