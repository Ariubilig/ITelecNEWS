import { Link } from "react-router-dom";
import "../components/Fallback.css";

export default function NotFound() {
  return (
    <div className="fallback-root">
      <h1 className="fallback-title">404</h1>
      <p className="fallback-text">Ийм хуудас олдсонгүй.</p>
      <div className="fallback-actions">
        <Link className="fallback-btn" to="/">Нүүр хуудас</Link>
      </div>
    </div>
  );
}
