import { lazy, Suspense, useRef } from "react";
import { Routes, Route } from "react-router-dom";

import Home from "./pages/home/Home";
import Navbar from "./components/UI/Navbar/Navbar";
import ScrollBar from "./components/UI/ScrollBar/ScrollBar";
import { useScrollSmoother } from "./hooks/useScrollSmoother";

const Reading    = lazy(() => import("./pages/reading/Reading"));
const Admin      = lazy(() => import("./pages/admin/Admin"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));


export default function App() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  useScrollSmoother(wrapperRef);

  return (
    <>
      <ScrollBar />
      <div id="smooth-wrapper" ref={wrapperRef}>
        <div id="smooth-content">
          <Navbar />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/"              element={<Home />} />
              <Route path="/article/:id"   element={<Reading />} />
              <Route path="/admin"         element={<Admin />} />
              <Route path="/admin/login"   element={<AdminLogin />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </>
  );
}
