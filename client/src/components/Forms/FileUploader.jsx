import React, { useState, useEffect } from "react";
import { Upload, Modal } from "antd";
import { PlusOutlined } from "@ant-design/icons";

const getBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

const FileUploader = ({
  maxCount = 1,
  accept = "*",
  onChange,
  resetTrigger,
  width = "104px",
  height = "104px",
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [fileList, setFileList] = useState([]);

  const handleCancel = () => setPreviewOpen(false);

  const handlePreview = async (file) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview);
    setPreviewOpen(true);
    setPreviewTitle(
      file.name || file.url?.substring(file.url.lastIndexOf("/") + 1),
    );
  };

  const handleChange = async ({ fileList }) => {
    setFileList(fileList);

    if (onChange) {
      const filesData = await Promise.all(
        fileList.map(async (file) => {
          if (file.originFileObj) {
            const base64 = await getBase64(file.originFileObj);
            const matches = base64.match(/^data:(.+);base64,(.+)$/);
            return {
              file_name: file.name,
              mime_type:
                matches?.[1] || file.type || "application/octet-stream",
              base64_content: matches?.[2] || "",
            };
          }
          return null;
        }),
      );
      onChange(filesData.filter(Boolean));
    }
  };

  useEffect(() => {
    if (resetTrigger !== undefined) {
      setFileList([]);
    }
  }, [resetTrigger]);

  const uploadButton = (
    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>Upload</div>
    </div>
  );

  return (
    <>
      <Upload
        listType="picture-card"
        fileList={fileList}
        onPreview={handlePreview}
        onChange={handleChange}
        beforeUpload={() => false}
        accept={accept}
        maxCount={maxCount}
        className="custom-uploader"
      >
        {fileList.length >= maxCount ? null : uploadButton}
      </Upload>

      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={handleCancel}
        centered
      >
        {previewImage && (
          <img
            alt="preview"
            style={{ width: "100%", borderRadius: "8px" }}
            src={previewImage}
          />
        )}
      </Modal>

      <style>
        {`
          .custom-uploader .ant-upload-list-picture-card-container,
          .custom-uploader .ant-upload-select-picture-card {
            width: ${width} !important;
            height: ${height} !important;
          }
          .custom-uploader .ant-upload-select-picture-card {
            background-color: rgba(0, 0, 0, 0.02) !important;
            border: 1px dashed var(--border-color, #d9d9d9) !important;
            border-radius: 12px !important;
            transition: all 0.3s;
          }
          .dark .custom-uploader .ant-upload-select-picture-card {
            background-color: rgba(255, 255, 255, 0.03) !important;
          }
          .custom-uploader .ant-upload-select-picture-card:hover {
            border-color: var(--main-color) !important;
          }
          .custom-uploader .ant-upload-list-item {
            width: ${width} !important;
            height: ${height} !important;
            border-radius: 12px !important;
            padding: 8px !important;
            border: 1px solid var(--border-color, #d9d9d9) !important;
          }
          .custom-uploader .ant-upload-list-item-thumbnail img {
            object-fit: cover;
            width: 100%;
            height: 100%;
            border-radius: 8px;
          }
          .dark .ant-upload-list-item-actions .anticon {
            color: #f1f1f1 !important;
          }
          .dark .custom-uploader {
            color: var(--text-base) !important;
          }
        `}
      </style>
    </>
  );
};

export default FileUploader;
