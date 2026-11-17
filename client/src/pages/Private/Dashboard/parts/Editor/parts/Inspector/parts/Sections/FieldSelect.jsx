import React from "react";
import FloatingSelect from "../../../../../../../../../components/Forms/FloatingSelect";

const NONE = "__none__";

// Dropdown of the real fields in the chosen information
const FieldSelect = ({ label, value, fields, onChange, noneLabel, helperText }) => {
  const current = value && fields.some((f) => f.name === value) ? value : noneLabel ? NONE : "";

  const options = [
    ...(noneLabel ? [{ value: NONE, label: noneLabel }] : []),
    ...fields.map((field) => ({ value: field.name, label: field.label })),
  ];

  return (
    <div>
      <FloatingSelect
        label={label}
        value={current}
        onChange={(e) => onChange(e.target.value === NONE ? undefined : e.target.value)}
        options={options}
      />
      {helperText && (
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

export default FieldSelect;