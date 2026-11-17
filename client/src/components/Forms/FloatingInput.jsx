import React, { useState } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const FloatingInput = ({
  id,
  label,
  value,
  onChange,
  type = 'text',
  fullWidth = true,
  length,
  required = false,
  disabled = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const displayType = isPassword && showPassword ? 'text' : type;

  // Validation logic
  const isInvalid = length && value?.length > length;
  const showError = isInvalid || (required && !value && value !== 0);
  const helperText = isInvalid
    ? `Maximum length is ${length} characters.`
    : required && !value
    ? `${label} is required.`
    : '';

  return (
    <TextField
      id={id}
      label={label}
      variant="outlined"
      type={displayType}
      value={value}
      onChange={onChange}
      fullWidth={fullWidth}
      size="small"
      required={required}
      error={showError}
      helperText={helperText}
      disabled={disabled}
      slotProps={{
        htmlInput: length ? { maxLength: length } : {},
      }}
      sx={{
        mb: 2,
        // 1. Label color
        '& .MuiInputLabel-root': {
          color: 'var(--menu-text)',
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: 'var(--main-color)',
        },
        '& .MuiInputLabel-root.Mui-disabled': {
          color: 'var(--menu-text)',
          opacity: 0.6, // Works for both light/dark themes
        },

        // 2. Input Root Styles
        '& .MuiOutlinedInput-root': {
          borderRadius: '8px',
          color: 'var(--text-base)',
          backgroundColor: 'transparent',
          transition: 'all 0.3s ease',
          
          '& fieldset': {
            borderColor: 'rgba(156, 163, 175, 0.4)',
          },
          '&:hover fieldset': {
            borderColor: 'var(--main-color)',
          },
          '&.Mui-focused fieldset': {
            borderColor: 'var(--main-color)',
          },

          // --- THEME-AWARE DISABLED STATE ---
          '&.Mui-disabled': {
            backgroundColor: 'rgba(156, 163, 175, 0.08)', // Slight tint for depth
            '& .MuiOutlinedInput-input': {
              // Points to your variable so it switches colors automatically
              WebkitTextFillColor: 'var(--text-base) !important',
              opacity: 0.6,
            },
            '& fieldset': {
              // Neutral border color visible on all backgrounds
              borderColor: 'rgba(156, 163, 175, 0.3) !important',
            },
          },
        },

        '& .MuiSvgIcon-root': {
          color: 'var(--menu-icon)',
        },

        '& .Mui-error': {
          '& fieldset': {
            borderColor: '#ef4444 !important',
          },
        },
      }}
      InputProps={
        isPassword
          ? {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                    sx={{ color: 'var(--menu-icon)' }}
                    disabled={disabled} // Disable toggle if input is disabled
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }
          : {}
      }
    />
  );
};

export default FloatingInput;