import './App.css'
import { Routes, Route } from "react-router-dom";
import { useRef } from "react";

import Home from "./pages/home/Home";
import Reading from './pages/reading/Reading';
import Navbar from "./components/ui/navbar/Navbar";
import ScrollBar from "./components/ui/ScrollBar/ScrollBar";

import { useScrollSmoother } from "./hooks/useScrollSmoother";
import { useFontsReady } from "./hooks/useFontsReady";


function App() {


  //////////////////////////////////////////////////
  const fontsReady = useFontsReady();
  const wrapperRef = useRef<HTMLDivElement>(null);
  useScrollSmoother(wrapperRef, fontsReady);
  //////////////////////////////////////////////////

  // if (!fontsReady) {
  //   return <div>Fonts loading…</div>;
  // }


  return (
    <>


    <ScrollBar />
    <div id="smooth-wrapper" ref={wrapperRef}>
      <div id="smooth-content">

        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/article/:id" element={<Reading />} />
          {/* <Route path="*" element={<NotFound />} /> */}
        </Routes>


      </div>
    </div>

    
    </>
  );
}


export default App;