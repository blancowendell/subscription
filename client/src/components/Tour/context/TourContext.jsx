import React, { createContext, useContext } from "react";
import { useTourGuide } from "../hooks/useTourGuide.jsx";

const TourContext = createContext();

export const TourProvider = ({ children }) => {
  const { startTour, TourGuide, currentStep, setCurrentStep } = useTourGuide();

  return (
    <TourContext.Provider value={{ startTour, currentStep, setCurrentStep }}>
      {children}
      <TourGuide />
    </TourContext.Provider>
  );
};

export const useGlobalTour = () => useContext(TourContext);