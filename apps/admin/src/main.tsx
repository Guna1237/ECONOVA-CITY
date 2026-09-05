import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const rootElement = document.getElementById("root");
if (rootElement === null) throw new Error("Admin application root is missing.");

createRoot(rootElement).render(
  <StrictMode>
    <main>ECONOVA: CITY Admin</main>
  </StrictMode>
);
