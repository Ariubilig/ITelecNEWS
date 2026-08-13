import { lazy, Suspense, useRef } from "react";
import { Routes, Route } from "react-router-dom";

import Home from "./pages/home/Home";
import NotFound from "./pages/NotFound";
import Navbar from "./components/UI/Navbar/Navbar";
import ScrollBar from "./components/UI/ScrollBar/ScrollBar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useScrollSmoother } from "./hooks/useScrollSmoother";

const Reading       = lazy(() => import("./pages/reading/Reading"));
const Admin         = lazy(() => import("./pages/admin/Admin"));
const AdminLogin    = lazy(() => import("./pages/admin/AdminLogin"));
const AdminComments = lazy(() => import("./pages/admin/AdminComments"));


export default function App() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  useScrollSmoother(wrapperRef);

  return (
    <>
      <ScrollBar />
      <div id="smooth-wrapper" ref={wrapperRef}>
        <div id="smooth-content">
          <Navbar />
          {/* Inside the layout so a page crash keeps the chrome and stays
              recoverable, rather than blanking the document. */}
          <ErrorBoundary>
            <Suspense fallback={null}>
              <Routes>
                <Route path="/"                element={<Home />} />
                <Route path="/article/:id"     element={<Reading />} />
                <Route path="/admin"           element={<Admin />} />
                <Route path="/admin/login"     element={<AdminLogin />} />
                <Route path="/admin/comments"  element={<AdminComments />} />
                <Route path="*"                element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
}
