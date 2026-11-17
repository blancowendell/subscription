import React from 'react';
import TextField from '@mui/material/TextField';

const FloatingTextArea = ({
  id,
  label,
  value,
  onChange,
  rows = 4,
  fullWidth = true,
  required = false
}) => {
  return (
    <TextField
      id={id}
      label={label}
      multiline
      rows={rows}
      value={value}
      onChange={onChange}
      variant="outlined"
      fullWidth={fullWidth}
      size="small"
      required={required}
      sx={{
        mb: 2,

        '& .MuiInputLabel-root': {
          color: 'var(--menu-text)',
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: 'var(--main-color)',
        },

        '& .MuiOutlinedInput-root': {
          borderRadius: '12px',
          color: 'var(--text-base)',
          backgroundColor: 'transparent',
          transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          
          '& fieldset': {
            borderColor: 'rgba(156, 163, 175, 0.4)',
          },
          '&:hover fieldset': {
            borderColor: 'var(--main-color)',
          },
          '&.Mui-focused fieldset': {
            borderColor: 'var(--main-color)',
            borderWidth: '2px',
          },
        },

        '& .MuiOutlinedInput-input': {
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(156, 163, 175, 0.3)',
            borderRadius: '10px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'var(--main-color)',
          },
        },
      }}
    />
  );
};

export default FloatingTextArea;