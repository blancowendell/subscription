// import React from "react";
// import {
//   FormControlLabel,
//   Checkbox,
// } from "@mui/material";

// const FloatingCheckbox = ({
//   label,
//   checked = false,
//   onChange,
//   disabled = false,
//   id,
// }) => {
//   return (
//     <FormControlLabel
//       control={
//         <Checkbox
//           id={id}
//           checked={checked}
//           onChange={onChange}
//           disabled={disabled}
//         />
//       }
//       label={label}
//     />
//   );
// };

// export default FloatingCheckbox;


import React from "react";
import { FormControlLabel, Checkbox } from "@mui/material";

const FloatingCheckbox = ({
  label,
  checked = false,
  onChange,
  disabled = false,
  id,
}) => {
  return (
    <FormControlLabel
      id={id}
      control={
        <Checkbox
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          sx={{
            color: "var(--menu-icon)",
            transition: "all 0.2s ease",
            // Checkmark color when checked
            "&.Mui-checked": {
              color: "var(--main-color)",
            },
            // --- THEME-AWARE DISABLED STATE ---
            "&.Mui-disabled": {
              // Ensures the box/checkmark is visible but dimmed
              color: "var(--menu-icon)",
              opacity: 0.5,
            },
          }}
        />
      }
      label={label}
      sx={{
        marginRight: 2,
        // Label Text Styles
        "& .MuiFormControlLabel-label": {
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "var(--text-base)",
          transition: "color 0.3s ease",
        },
        // Label Disabled State
        "& .Mui-disabled": {
          // Replaces MUI's default transparent gray with a theme-aware dimmed color
          color: "var(--text-base) !important",
          opacity: 0.6,
        },
      }}
    />
  );
};

export default FloatingCheckbox;
