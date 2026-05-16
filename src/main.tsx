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
                borderRadius: "22px",
                border: "1px solid var(--color-border, rgba(148, 163, 184, 0.35))",
                background: "var(--color-card, rgba(255, 255, 255, 0.92))",
                color: "var(--color-text, #0f172a)",
                boxShadow: "var(--shadow-card, 0 20px 48px rgba(15, 23, 42, 0.12))",
                backdropFilter: "var(--glass-blur, blur(24px))"
              }
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </AdminThemeProvider>
  </React.StrictMode>
);
