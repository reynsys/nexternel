import { Navigate } from "react-router-dom";

/** Legacy entry — home dashboard now lives at `/`. */
export function HomeRedirect() {
  return <Navigate to="/" replace />;
}
