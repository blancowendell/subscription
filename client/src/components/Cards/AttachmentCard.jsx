import React, { useState } from "react";
import FileUploader from "../Forms/FileUploader";
import NormalModal from "../Modals/NormalModal";

const AttachmentCard = ({
  title = "Attachment",
  subTitle = "Upload a file",
  currentImageSrc = null,
  hasNewFiles = false,
  checkNumber = "N/A", // 🌟 Added property to display the check reference dynamically in the modal header
  previewInstruction = "Current Saved Scan:",
  replaceInstruction = "Drop a new file below to replace this attachment:",
  onChange,
  resetTrigger,
  maxCount = 1,
  accept = "image/*",
  uploaderWidth = "140px",
  uploaderHeight = "140px",
}) => {
  const [isLargePreviewOpen, setIsLargePreviewOpen] = useState(false);

  return (
    <div className="h-full bg-gray-50/50 dark:bg-gray-800/20 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
        {title}
      </h3>

      <div className="flex-grow p-6 bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center text-center min-h-[250px]">
        {currentImageSrc && !hasNewFiles ? (
          <div className="flex flex-col items-center w-full">
            <span className="text-xs font-semibold text-gray-400 mb-2">
              {previewInstruction}
            </span>

            <button
              type="button"
              onClick={() => setIsLargePreviewOpen(true)} // 🌟 Sets local modal state true on thumbnail click
              className="group relative block w-full max-h-36 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300 bg-gray-50 p-1"
              title="Click to view full image"
            >
              <img
                src={currentImageSrc}
                alt="Attachment Specimen"
                className="w-full h-full max-h-32 object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-lg">
                <span className="text-white text-xs font-medium px-2 py-1 bg-black/60 rounded-md">
                  🔍 Click to Preview
                </span>
              </div>
            </button>

            <p className="text-[10px] text-gray-400 mt-4 mb-4 max-w-[200px]">
              {replaceInstruction}
            </p>
          </div>
        ) : (
          <>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {subTitle}
            </span>
            <p className="text-xs text-gray-400 mb-6">
              {replaceInstruction === "Drop a new file below to replace this attachment:" 
                ? "Upload a high-resolution file" 
                : replaceInstruction}
            </p>
          </>
        )}

        <FileUploader
          maxCount={maxCount}
          accept={accept}
          onChange={onChange}
          resetTrigger={resetTrigger}
          width={uploaderWidth}
          height={uploaderHeight}
        />
      </div>

      {/* 🌟 MOVED INTERNALLY: Self-contained Lightbox UI Element */}
      <NormalModal
        open={isLargePreviewOpen}
        title={`Check Specimen Scan Preview — No. ${checkNumber}`}
        onCancel={() => setIsLargePreviewOpen(false)}
        hideCancel={true}
        width={800}
      >
        {currentImageSrc && (
          <img
            alt="Full Preview Check specimen"
            className="w-full h-auto object-contain rounded-xl max-h-[70vh] mt-2 border dark:border-slate-800"
            src={currentImageSrc}
          />
        )}
      </NormalModal>
    </div>
  );
};

export default AttachmentCard;