import { createRoot } from "react-dom/client";

import { lazy, Suspense } from "react";
const App = lazy(() => new URLSearchParams(location.search).get("world") === "geographic"
  ? import("./game/bangkok/geographic/Prototype") : import("./App"));
import { ErrorBoundary } from "@/components/error-boundary";

import "./index.css";
import "./game/ui/night-drive.css";
import "./game/ui/arcade-title.css";

createRoot(document.getElementById("root")!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <Suspense fallback={<div>Loading Bangkok…</div>}><App /></Suspense>
  </ErrorBoundary>,
);
