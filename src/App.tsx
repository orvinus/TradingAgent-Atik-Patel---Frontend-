// src/App.tsx
import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/Lib/queryClient";
import { WSProvider } from "@/ws/WSProvider";
import { router } from "@/router/index";
import { ToastViewport } from "@/components/ui/Toast";
import { useAppStore } from "@/store/index";
import { loadRoleAndPermissions } from "@/hooks/usePermissions";

export default function App() {
  // Refresh role + permissions whenever we have a token (page reload, etc.).
  const token = useAppStore((s) => s.token);
  useEffect(() => {
    void loadRoleAndPermissions(token);
  }, [token]);

  return (
    <QueryClientProvider client={queryClient}>
      <WSProvider>
        <RouterProvider router={router} />
        <ToastViewport />
      </WSProvider>
    </QueryClientProvider>
  );
}