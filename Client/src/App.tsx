import './App.css'
import { Routes, Route } from "react-router-dom";
import Home from "./pages/home/Home";
import Reading from './pages/reading/Reading';
import Navbar from "./components/ui/navbar/Navbar";


function App() {

  

  return (
    <>

    <Navbar />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/Reading" element={<Reading />} />
      
      {/* <Route path="*" element={<NotFound />} /> */}
    </Routes>


    </>
  )
}


export default App