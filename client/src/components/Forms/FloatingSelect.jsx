
import React, { useState, useRef } from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ListSubheader from "@mui/material/ListSubheader";

const FloatingSelect = ({
  id,
  label,
  value,
  onChange,
  options = [],
  fullWidth = true,
  disabled = false,
  onRemoteSearch, 
}) => {
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  const filteredOptions = options.filter((option) => {
    const labelText = option?.label ? String(option.label).toLowerCase() : "";
    return labelText.includes(search.toLowerCase());
  });

  const focusSearch = () => {
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    if (onRemoteSearch) {
      onRemoteSearch(val); 
    }
  };

  const handleKeyDown = (e) => {
    if (["ArrowDown", "ArrowUp", "Enter", "Escape", "Tab"].includes(e.key)) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      const nextSearch = search.slice(0, -1);
      handleSearchChange(nextSearch);
      focusSearch();
      return;
    }

    if (e.key.length === 1) {
      e.preventDefault();
      const nextSearch = search + e.key;
      handleSearchChange(nextSearch);
      focusSearch();
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      document.querySelector('[role="option"]')?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const items = document.querySelectorAll('[role="option"]');
      items[items.length - 1]?.focus();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      document.querySelector('[role="option"]')?.click();
      return;
    }
    if (e.key !== "Backspace") e.stopPropagation();
  };

  return (
    <TextField
      select
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      variant="outlined"
      fullWidth={fullWidth}
      size="small"
      disabled={disabled}
      onClose={() => {
        setSearch("");
        if (onRemoteSearch) onRemoteSearch(""); 
      }}
      sx={{
        mb: 2,
        "& .MuiInputLabel-root": { color: "var(--menu-text)" },
        "& .MuiInputLabel-root.Mui-focused": { color: "var(--main-color)" },
        "& .MuiInputLabel-root.Mui-disabled": { 
          color: "var(--menu-text)", 
          opacity: 0.6 
        },
        
        "& .MuiOutlinedInput-root": {
          borderRadius: "8px",
          color: "var(--text-base)",
          // FIXED: Wrapped property with quotes
          "& fieldset": { borderColor: "rgba(156, 163, 175, 0.4)" }, 
          "&:hover fieldset": { borderColor: "var(--main-color)" },
          "&.Mui-focused fieldset": { borderColor: "var(--main-color)" },

          "&.Mui-disabled": {
            backgroundColor: "rgba(156, 163, 175, 0.1)", 
            "& .MuiSelect-select": {
              WebkitTextFillColor: "var(--text-base) !important", 
              opacity: 0.6,
            },
            "& fieldset": {
              borderColor: "rgba(144, 145, 146, 0.3) !important",
            },
            "& .MuiSvgIcon-root": {
              color: "var(--menu-icon) !important",
              opacity: "0.4 !important",
            },
          },
        },
        "& .MuiSvgIcon-root": { color: "var(--menu-icon)" },
      }}
      SelectProps={{
        MenuProps: {
          PaperProps: {
            className: "dark:bg-slate-900 border-gray-300 dark:border-slate-800 shadow-xl",
            sx: {
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-base)",
            },
          },
        },
      }}
    >
      <ListSubheader className="dark:bg-slate-900 bg-white">
        <TextField
          inputRef={searchRef}
          size="small"
          placeholder="Search item..."
          fullWidth
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          sx={{
            my: 1,
            "& .MuiOutlinedInput-root": {
              color: "var(--text-base)",
              backgroundColor: "rgba(156, 163, 175, 0.05)",
            },
          }}
        />
      </ListSubheader>

      {filteredOptions.length > 0 ? (
        filteredOptions.map((option) => (
          <MenuItem 
            key={option.value} 
            value={option.value}
            sx={{
              fontSize: "0.875rem",
              "&:hover": { backgroundColor: "rgba(255, 4, 4, 0.1)" },
              "&.Mui-selected": { 
                backgroundColor: "rgba(255, 4, 4, 0.2) !important",
                color: "var(--main-text-color)",
                fontWeight: 600
              },
            }}
          >
            {option.label}
          </MenuItem>
        ))
      ) : (
        <MenuItem disabled className="dark:text-gray-500">
          <InfoOutlinedIcon fontSize="small" color="warning" style={{ marginRight: 6 }} />
          No options found
        </MenuItem>
      )}
    </TextField>
  );
};

export default FloatingSelect;