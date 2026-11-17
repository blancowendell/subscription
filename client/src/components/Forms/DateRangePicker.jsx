import React from 'react';
import { DatePicker } from 'antd';
import { Typography } from '@mui/material';

const { RangePicker } = DatePicker;

const FloatingDateRangePicker = ({
  id,
  label,
  value,
  onChange,
  fullWidth = true,
  disabled = false,
}) => {
  return (
    <div 
      className="transition-colors duration-300"
      style={{ width: fullWidth ? '100%' : 'auto', marginTop: 8, marginBottom: 16 }}
    >
      {label && (
        <Typography
          variant="caption"
          display="block"
          gutterBottom
          sx={{ 
            marginBottom: 0.5, 
            fontWeight: 600,
            // MUI logic to respect your CSS variables
            color: 'var(--text-base)', 
            opacity: 0.8
          }}
        >
          {label}
        </Typography>
      )}
      <RangePicker
        id={id}
        value={value}
        onChange={onChange}
        format="YYYY-MM-DD"
        disabled={disabled}
        allowClear
        // We use status to apply your main color via CSS if needed, 
        // but here we override via style and className
        className="dark:bg-slate-900 dark:border-slate-700 dark:hover:border-[var(--main-color)]"
        style={{
          width: '100%',
          borderRadius: 8,
          padding: '6.5px 11px',
          height: 40,
          backgroundColor: 'transparent', // Let Tailwind handle the bg
          color: 'inherit'
        }}
        // Ant Design specific: ensures the popup matches the theme
        popupClassName="dark-date-picker" 
      />
    </div>
  );
};

export default FloatingDateRangePicker;