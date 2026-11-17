import React from "react";
import TextField from "@mui/material/TextField";
import { NumericFormat } from "react-number-format";

const FloatingCurrencyInput = ({
  id,
  label = "Amount",
  value,
  onChange,
  fullWidth = true,
  decimalScale = 2,
  allowNegative = false,
  disabled = false,
  required = false,
}) => {
  // --- Validation Logic copied from your example ---
  const showError = required && !value && value !== 0;
  const helperText = showError ? `${label} is required.` : "";

  return (
    <NumericFormat
      value={value ?? ""}
      thousandSeparator
      decimalScale={decimalScale}
      fixedDecimalScale
      allowNegative={allowNegative}
      prefix="₱ "
      onValueChange={(vals) => {
        const next = vals.floatValue ?? "";
        onChange?.({ target: { value: next } });
      }}
      customInput={TextField}
      id={id}
      label={label}
      variant="outlined"
      size="small"
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
      error={showError}       // Triggers the red outline
      helperText={helperText} // Displays the error message
      inputProps={{ inputMode: "decimal" }}
      sx={{
        mb: 2,

        /* LABEL */
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

        /* INPUT ROOT */
        "& .MuiOutlinedInput-root": {
          borderRadius: "8px",
          color: "var(--text-base)",

          "& fieldset": {
            borderColor: "rgba(156, 163, 175, 0.4)",
          },
          "&:hover fieldset": {
            borderColor: "var(--main-color)",
          },
          "&.Mui-focused fieldset": {
            borderColor: "var(--main-color)",
          },

          /* DISABLED */
          "&.Mui-disabled": {
            backgroundColor: "rgba(156, 163, 175, 0.08)",
            "& input": {
              WebkitTextFillColor: "var(--text-base) !important",
              opacity: 0.6,
            },
            "& fieldset": {
              borderColor: "rgba(156, 163, 175, 0.3) !important",
            },
          },
        },

        /* ERROR STATE (From your example) */
        "& .Mui-error": {
          "& fieldset": {
            borderColor: "#ef4444 !important",
          },
        },

        /* INPUT TEXT */
        "& input": {
          color: "var(--text-base)",
        },
      }}
    />
  );
};

export default FloatingCurrencyInput;