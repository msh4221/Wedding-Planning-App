"use client";

import { ReactNode, useEffect } from "react";
import { AuthProvider } from "@/lib/mock-auth";
import { SidebarProvider } from "@/components/ui/sidebar";

export function Providers({ children }: { children: ReactNode }) {
  // Global error handler to catch async vis-timeline errors
  useEffect(() => {
    // Use window.onerror for broader error catching
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      const msgStr = String(message);
      if (
        msgStr.includes("rollingModeBtn") ||
        msgStr.includes("Cannot read properties of null")
      ) {
        console.warn("Suppressed vis-timeline error:", msgStr);
        return true; // Prevents the error from propagating
      }
      // Call original handler if it exists
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason);
      if (
        message?.includes("rollingModeBtn") ||
        message?.includes("vis-timeline") ||
        message?.includes("Cannot read properties of null")
      ) {
        event.preventDefault();
        console.warn("Suppressed vis-timeline async error");
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.onerror = originalOnError;
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <AuthProvider>
      <SidebarProvider>
        {children}
      </SidebarProvider>
    </AuthProvider>
  );
}
