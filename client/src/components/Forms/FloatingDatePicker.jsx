// import React, { useMemo } from "react";
// import { DatePicker } from "antd";
// import TextField from "@mui/material/TextField";
// import InputAdornment from "@mui/material/InputAdornment";
// import IconButton from "@mui/material/IconButton";
// import ClearIcon from "@mui/icons-material/Clear";
// import dayjs from "dayjs";


// const FloatingDatePicker = ({
//   id,
//   label,
//   value,
//   onChange,
//   fullWidth = true,
//   disabled = false,
//   format = "YYYY-MM-DD",
//   required = false,
//   length,
//   allowClear = true,
// }) => {
//   const dateObj = useMemo(() => {
//     if (!value) return null;
//     if (typeof value === "string") {
//       const d = dayjs(value);
//       return d.isValid() ? d : null;
//     }
//     return dayjs.isDayjs(value) ? value : dayjs(value);
//   }, [value]);

//   const displayValue = dateObj ? dateObj.format(format) : "";

//   const isInvalid = length && displayValue.length > length;
//   const helperText = isInvalid
//     ? `Maximum length is ${length} characters.`
//     : required && !displayValue
//     ? `${label} is required.`
//     : "";

//   const handleClear = (e) => {
//     e.stopPropagation();
//     onChange?.(null, "");
//   };

//   const handleDateChange = (date, dateString) => {
//     onChange?.(date, dateString);
//   };

//   return (
//     <div
//       style={{
//         width: fullWidth ? "100%" : "auto",
//         marginTop: 8,
//         marginBottom: 16,
//         position: "relative",
//       }}
//     >
//       <TextField
//         id={id}
//         label={label}
//         variant="outlined"
//         value={displayValue}
//         fullWidth={fullWidth}
//         size="small"
//         required={required}
//         error={isInvalid || (required && !displayValue)}
//         helperText={helperText}
//         InputProps={{
//           readOnly: true,
//           endAdornment: (
//             <InputAdornment position="end">
//               {displayValue && allowClear && !disabled ? (
//                 <IconButton onClick={handleClear} size="small" edge="end">
//                   <ClearIcon fontSize="small" />
//                 </IconButton>
//               ) : null}
//             </InputAdornment>
//           ),
//           sx: {
//             borderRadius: "8px",
//           },
//         }}
//         sx={{
//           "& .MuiOutlinedInput-root": {
//             borderRadius: "8px",
//           },
//         }}
//       />

//       <div
//         style={{
//           position: "absolute",
//           inset: 0,
//           zIndex: 2,
//           pointerEvents: disabled ? "none" : "auto",
//         }}
//       >
//         <DatePicker
//           id={`${id}-hidden`}
//           value={dateObj}
//           onChange={handleDateChange}
//           format={format}
//           disabled={disabled}
//           allowClear={false}
//           getPopupContainer={() => document.body}
//           style={{
//             width: "100%",
//             height: "100%",
//             opacity: 0,
//           }}
//         />
//       </div>
//     </div>
//   );
// };

// export default FloatingDatePicker;


import React from "react";
import { DatePicker } from "antd";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import ClearIcon from "@mui/icons-material/Clear";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import dayjs from "dayjs";

const FloatingDatePicker = ({
  id,
  label,
  value,
  onChange,
  fullWidth = true,
  disabled = false,
  format = "YYYY-MM-DD",
  required = false,
  length,
  allowClear = true,
}) => {
  // Safe Hook usage to prevent "dispatcher is null"
  const dateObj = React.useMemo(() => {
    if (!value) return null;
    const d = dayjs(value);
    return d.isValid() ? d : null;
  }, [value]);

  const displayValue = dateObj ? dateObj.format(format) : "";

  // Validation logic
  const isInvalid = length && displayValue.length > length;
  const showError = isInvalid || (required && !displayValue);
  const helperText = isInvalid
    ? `Maximum length is ${length} characters.`
    : required && !displayValue
    ? `${label} is required.`
    : "";

  const handleClear = (e) => {
    e.stopPropagation();
    // Ant Design expects (date, dateString)
    onChange?.(null, "");
  };

  const handleDateChange = (date, dateString) => {
    onChange?.(date, dateString);
  };

  return (
    <div
      style={{
        width: fullWidth ? "100%" : "auto",
        position: "relative",
      }}
    >
      <TextField
        id={id}
        label={label}
        variant="outlined"
        value={displayValue}
        fullWidth={fullWidth}
        size="small"
        required={required}
        error={showError}
        helperText={helperText}
        disabled={disabled}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              {displayValue && allowClear && !disabled ? (
                <IconButton onClick={handleClear} size="small" edge="end">
                  <ClearIcon fontSize="small" />
                </IconButton>
              ) : (
                <CalendarMonthIcon 
                  fontSize="small" 
                  sx={{ color: 'var(--menu-icon)', mr: 0.5, opacity: 0.7 }} 
                />
              )}
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 2,
          // 1. Label color
          "& .MuiInputLabel-root": {
            color: "var(--menu-text)",
          },
          "& .MuiInputLabel-root.Mui-focused": {
            color: "var(--main-color)",
          },
          "& .MuiInputLabel-root.Mui-disabled": {
            color: "var(--menu-text)",
            opacity: 0.6,
          },

          // 2. Input Root Styles
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            color: "var(--text-base)",
            backgroundColor: "transparent",
            transition: "all 0.3s ease",

            "& fieldset": {
              borderColor: "rgba(156, 163, 175, 0.4)",
            },
            "&:hover fieldset": {
              borderColor: "var(--main-color)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "var(--main-color)",
            },

            // --- THEME-AWARE DISABLED STATE ---
            "&.Mui-disabled": {
              backgroundColor: "rgba(156, 163, 175, 0.08)",
              "& .MuiOutlinedInput-input": {
                WebkitTextFillColor: "var(--text-base) !important",
                opacity: 0.6,
              },
              "& fieldset": {
                borderColor: "rgba(156, 163, 175, 0.3) !important",
              },
            },
          },

          "& .MuiSvgIcon-root": {
            color: "var(--menu-icon)",
          },

          "& .Mui-error": {
            "& fieldset": {
              borderColor: "#ef4444 !important",
            },
          },
        }}
      />

      {/* Transparent Overlay: 
        The Ant Design DatePicker sits on top but is invisible. 
        When you click the MUI TextField, you are actually clicking this.
      */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "40px", 
          zIndex: 2,
          pointerEvents: disabled ? "none" : "auto",
        }}
      >
        <DatePicker
          id={`${id}-hidden`}
          value={dateObj}
          onChange={handleDateChange}
          format={format}
          disabled={disabled}
          allowClear={false}
          getPopupContainer={(trigger) => trigger.parentElement}
          style={{
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
          }}
        />
      </div>
    </div>
  );
};

export default FloatingDatePicker;