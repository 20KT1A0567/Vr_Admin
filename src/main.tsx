import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { AdminThemeProvider } from "components/providers/AdminThemeProvider";
import "./styles/index.css";

const queryClient = new QueryClient();
const routerBaseName = import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL.replace(/\/$/, "");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AdminThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter
          basename={routerBaseName}
          future={{
            v7_relativeSplatPath: true,
            v7_startTransition: true
          }}
        >
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3200,
              style: {
                borderRadius: "16px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(17, 24, 39, 0.8)",
                color: "#fff",
                boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                backdropFilter: "blur(12px)"
              }
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </AdminThemeProvider>
  </React.StrictMode>
);
