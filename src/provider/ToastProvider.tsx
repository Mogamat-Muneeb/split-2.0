"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

export const TProvider = () => {
const { theme } = useTheme();
  return (
    <Toaster
      style={
        {
          "--normal-bg": theme === "dark" ? "#101011" : "white",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
    />
  );
};
