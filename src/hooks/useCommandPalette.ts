import { useEffect } from "react";
import { useAppStore } from "@/store/index";
 
export function useCommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore();
 
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);
 
  return { open: commandPaletteOpen, setOpen: setCommandPaletteOpen };
}