import { Component, type ErrorInfo, type ReactNode } from "react";
import "./Fallback.css";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors so one bad article body (or a failed lazy chunk)
 * degrades to a message instead of unmounting the app and leaving a blank page.
 *
 * Must be a class: there is still no hook equivalent of componentDidCatch.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Render error:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="fallback-root">
        <h1 className="fallback-title">Алдаа гарлаа</h1>
        <p className="fallback-text">
          Уучлаарай, ямар нэг зүйл буруу боллоо. Хуудсыг дахин ачаална уу.
        </p>
        <div className="fallback-actions">
          <button className="fallback-btn" onClick={() => window.location.reload()}>
            Дахин ачаалах
          </button>
          <a className="fallback-btn" href="/">Нүүр хуудас</a>
        </div>

        {/* Stack traces are useful locally and noise (or a leak) in production. */}
        {import.meta.env.DEV && (
          <pre className="fallback-detail">{error.stack ?? error.message}</pre>
        )}
      </div>
    );
  }
}
