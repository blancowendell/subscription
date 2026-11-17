import React from 'react';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const FloatingNumberInput = ({
  id,
  label,
  value,
  onChange,
  fullWidth = true,
  inputProps = {},
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  disabled = false,
}) => {
  const handleKeyDown = (e) => {
    const allowedKeys = [
      'Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'
    ];
    if (allowedKeys.includes(e.key) || (e.key >= '0' && e.key <= '9')) {
      return;
    }
    e.preventDefault();
  };

  const handleChange = (e) => {
    const val = e.target.value;
    if (val === "" || /^\d+$/.test(val)) {
      onChange(val);
    }
  };

  const increment = () => {
    if (disabled) return;
    const current = Number(value) || 0;
    const next = Math.min(current + step, max);
    onChange(String(next));
  };

  const decrement = () => {
    if (disabled) return;
    const current = Number(value) || 0;
    const next = Math.max(current - step, min);
    onChange(String(next));
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <TextField
        id={id}
        label={label}
        variant="outlined"
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        fullWidth={fullWidth}
        size="small"
        disabled={disabled}
        inputProps={{
          inputMode: 'numeric',
          pattern: '[0-9]*',
          ...inputProps,
          style: { 
            textAlign: 'left',
            fontWeight: 600,
          },
        }}
        sx={{
          flexGrow: 1,
          // 1. Label Colors
          '& .MuiInputLabel-root': {
            color: 'var(--menu-text)',
            '&.Mui-focused': {
              color: 'var(--main-color)',
            },
            '&.Mui-disabled': {
              // Using opacity on the existing variable instead of solid white
              color: 'var(--menu-text)',
              opacity: 0.6, 
            },
          },

          // 2. Input Field Styles
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            backgroundColor: 'transparent',
            color: 'var(--text-base)',
            transition: 'all 0.2s',
            
            '& fieldset': {
              borderColor: 'rgba(156, 163, 175, 0.4)',
            },
            '&:hover fieldset': {
              borderColor: 'var(--main-color)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'var(--main-color)',
            },

            // --- THEME AWARE DISABLED STATE ---
            '&.Mui-disabled': {
              // Background: slight tint based on text color so it works in both modes
              backgroundColor: 'rgba(156, 163, 175, 0.05)',
              '& .MuiOutlinedInput-input': {
                // IMPORTANT: We use the text-base variable but lower the opacity
                // WebkitTextFillColor overrides the browser's default "gray"
                WebkitTextFillColor: 'var(--text-base) !important',
                opacity: 0.6,
              },
              '& fieldset': {
                // Makes the border visible but subtle in both light and dark
                borderColor: 'rgba(156, 163, 175, 0.3) !important',
              },
            },
          },
        }}
      />
      
      {/* Stepper Buttons Container */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <IconButton
          aria-label="increment"
          size="small"
          onClick={increment}
          disabled={disabled}
          sx={{ 
            p: '2px', 
            borderRadius: '6px',
            // Use a dynamic background that works in both modes
            backgroundColor: 'rgba(156, 163, 175, 0.1)',
            color: 'var(--menu-icon)',
            '&:hover': { 
              backgroundColor: 'var(--main-color)', 
              color: '#fff' 
            },
            '&.Mui-disabled': {
              opacity: 0.3,
            }
          }}
        >
          <ArrowDropUpIcon fontSize="small" />
        </IconButton>
        <IconButton
          aria-label="decrement"
          size="small"
          onClick={decrement}
          disabled={disabled}
          sx={{ 
            p: '2px', 
            borderRadius: '6px',
            backgroundColor: 'rgba(156, 163, 175, 0.1)',
            color: 'var(--menu-icon)',
            '&:hover': { 
              backgroundColor: 'var(--main-color)', 
              color: '#fff' 
            },
            '&.Mui-disabled': {
              opacity: 0.3,
            }
          }}
        >
          <ArrowDropDownIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default FloatingNumberInput;