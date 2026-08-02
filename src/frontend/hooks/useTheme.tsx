import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type ThemeMode = "light" | "dark";
interface ThemeContextType {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "light",
  setMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
      const stored = localStorage.getItem("tv-theme");
      return (stored === "dark" ? "dark" : "light") as ThemeMode;
  });

  useEffect(() => {
     const root = document.documentElement;
     root.classList.remove("dark");
     if (mode === "dark") {
        root.classList.add("dark");
     }
     localStorage.setItem("tv-theme", mode);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
        {children}
    </ThemeContext.Provider>
  );
};
