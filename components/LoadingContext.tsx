"use client";

import React, { createContext, useContext, useState } from "react";
import LoadingScreen from "./LoadingScreen";

interface LoadingContextType {
  isLoaded: boolean;
  setIsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  triggerLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoaded: false,
  setIsLoaded: () => {},
  triggerLoading: () => {},
});

export const useGlobalLoading = () => useContext(LoadingContext);

export const GlobalLoadingWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const triggerLoading = () => {
    setIsLoaded(false);
  };

  return (
    <LoadingContext.Provider value={{ isLoaded, setIsLoaded, triggerLoading }}>
      {!isLoaded && <LoadingScreen onComplete={() => setIsLoaded(true)} />}
      {children}
    </LoadingContext.Provider>
  );
};
