import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import NormalModal from "../Modals/NormalModal"; // adjust path
import FloatingInput from "./FloatingInput";

const FloatingPathSelect = ({
  id,
  label,
  value,
  onChange,
  fullWidth = true,
  disabled = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [tempPath, setTempPath] = useState(value || "");

  const openModal = () => {
    setTempPath(value || "");
    setModalOpen(true);
  };

  const handleConfirm = () => {
    onChange(tempPath);
    setModalOpen(false);
  };

  return (
    <>
      <TextField
        id={id}
        label={label}
        value={value || ""}
        variant="outlined"
        fullWidth={fullWidth}
        size="small"
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                onClick={openModal}
                disabled={disabled}
                size="small"
              >
                <FolderOpenOutlinedIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
          },
        }}
        disabled={disabled}
      />

      <NormalModal
        open={modalOpen}
        title={`Select ${label}`}
        confirmText="Select"
        cancelText="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        width={500}
      >
        <FloatingInput
          label={label}
          value={tempPath}
          onChange={(e) => setTempPath(e.target.value)}
        />
      </NormalModal>
    </>
  );
};

export default FloatingPathSelect;
