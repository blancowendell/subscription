import { useState } from "react";
import { Tour } from "antd";

export const useTourGuide = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0); // Add tracking state

  const startTour = (newSteps) => {
    setSteps(newSteps);
    setCurrentStep(0); // Reset to first step
    setIsOpen(true);
  };

  const TourGuide = () => (
    <Tour
      open={isOpen}
      current={currentStep} // Control the active step
      onChange={(step) => setCurrentStep(step)} // Allow clicking next/back manually
      onClose={() => setIsOpen(false)}
      steps={steps}
      maskClosable={false}
      arrow
    />
  );

  // Expose currentStep and setCurrentStep to the context provider
  return { startTour, TourGuide, currentStep, setCurrentStep };
};