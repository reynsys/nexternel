import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { SkinProvider } from "./skins/SkinProvider";
import { installErrorRing } from "./diagnostics/errorRing";
import { loadBuiltins } from "./plugins/loadBuiltins";

installErrorRing();
loadBuiltins();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SkinProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SkinProvider>
  </StrictMode>
);
