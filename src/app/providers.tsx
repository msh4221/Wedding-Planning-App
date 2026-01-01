"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/mock-auth";
import { SidebarProvider } from "@/components/ui/sidebar";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SidebarProvider>
        {children}
      </SidebarProvider>
    </AuthProvider>
  );
}
