"use client";

import { Toaster } from "sonner";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        offset={20}
        gap={8}
        visibleToasts={4}
        richColors={false}
        closeButton
        toastOptions={{
          duration: 4000,
          classNames: {
            toast: "atlas-sonner-toast",
          },
        }}
      />
    </>
  );
}