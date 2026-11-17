import React from 'react';
import Lottie from 'lottie-react';
import underConstructionAnimation from '../../../assets/animations/under-maintenance.json'; 

const UnderConstruction = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[400px] px-4 py-20 text-center 
                    bg-white dark:bg-[#111827] 
                    rounded-2xl shadow-sm border border-transparent dark:border-slate-800 
                    transition-colors duration-300">
      
      {/* Animation Container */}
      <div className="w-full max-w-sm opacity-90 dark:opacity-80">
        <Lottie animationData={underConstructionAnimation} loop={true} />
      </div>

      {/* Text Content */}
      <div className="mt-8 space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-gray-800 dark:text-slate-100">
          Page Under Construction
        </h1>
        
        <div className="flex justify-center">
          <div className="h-1 w-12 bg-[var(--main-color)] rounded-full mb-4"></div>
        </div>

        <p className="max-w-md mx-auto text-gray-500 dark:text-slate-400 font-medium">
          We’re currently fine-tuning this section to improve your experience. 
          <span className="block mt-1 italic text-sm text-[var(--main-color)]">
            Stay tuned for updates!
          </span>
        </p>
      </div>

      {/* Decorative background element for Dark Mode depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--main-color)] opacity-[0.03] rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[var(--main-color)] opacity-[0.03] rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};

export default UnderConstruction;