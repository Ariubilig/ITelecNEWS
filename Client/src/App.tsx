import './App.css'
import { Routes, Route } from "react-router-dom";
import { useRef } from "react";

import Home from "./pages/home/Home";
import Reading from './pages/reading/Reading';
import Admin from './pages/admin/Admin';
import AdminLogin from './pages/admin/AdminLogin';
import Navbar from './components/UI/Navbar/Navbar';
import ScrollBar from './components/UI/ScrollBar/ScrollBar';

import { useScrollSmoother } from "./hooks/useScrollSmoother";


function App() {
  

  const wrapperRef = useRef<HTMLDivElement>(null);
  useScrollSmoother(wrapperRef);

  return (
    <>


      <ScrollBar />

      <div id="smooth-wrapper" ref={wrapperRef}>
        <div id="smooth-content">


          <Navbar />

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/article/:id" element={<Reading />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/login" element={<AdminLogin />} />
          </Routes>


        </div>
      </div>
    </>
  );
}


export default App;
