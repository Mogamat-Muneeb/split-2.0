import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./provider/theme-provider";
import { GoalProvider } from "./provider/GoalContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <GoalProvider>
          <ThemeProvider>
            {/* <TProvider /> */}
            <App />
          </ThemeProvider>
        </GoalProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
