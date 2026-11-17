import React from "react";
import FloatingSelect from "../../../../../../../../components/Forms/FloatingSelect";
import FloatingCheckbox from "../../../../../../../../components/Forms/FloatingCheckboxGroup";
import SourcePicker from "./Sections/SourcePicker";
import FieldSelect from "./Sections/FieldSelect";
import ChartTypePicker from "./Sections/ChartTypePicker";
import StaticTableEditor from "./Sections/StaticTableEditor";
import useWidgetData, { pickFields } from "../../../../../utils/useWidgetData";
import {
  AGGREGATE_OPTIONS,
  FORMAT_OPTIONS,
  REFRESH_OPTIONS,
} from "../../../../../utils/widgetCatalog";

const LIMIT_OPTIONS = [3, 5, 8, 10].map((n) => ({ value: String(n), label: `${n} items` }));

// The app's FloatingSelect works with string values
const SimpleSelect = ({ label, value, options, onChange, helperText }) => (
  <div>
    <FloatingSelect
      label={label}
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
      options={options.map((o) => ({ value: String(o.value), label: o.label }))}
    />
    {helperText && (
      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{helperText}</p>
    )}
  </div>
);

const SourceToggle = ({ value, onChange }) => (
  <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-xs">
    {[
      { value: "system", label: "From the system" },
      { value: "manual", label: "Type my own" },
    ].map((option) => {
      const active = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(option.value)}
          className={`py-1.5 rounded-md transition-colors ${
            active
              ? "bg-white dark:bg-slate-900 font-semibold text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

const DataTab = ({ widget, onUpdate, onUpdateSettings }) => {
  const settings = widget.settings || {};
  const isTable = widget.type === "table";
  const manual =
    isTable &&
    (settings.source === "manual" ||
      (!settings.source && !widget.apiName && (widget.tableColumns || []).length > 0));

  const { rows, fields, loading, error } = useWidgetData(manual ? null : widget.apiName);
  const numberFields = fields.filter((f) => f.kind === "number");
  const picked = pickFields(fields, settings);
  const set = (patch) => onUpdateSettings(widget.id, patch);

  const handleSource = (source) =>
    onUpdate(widget.id, {
      apiId: source?.id ?? null,
      apiName: source?.name ?? null,
      apiLabel: source?.label ?? null,
      apiUnavailable: false,
      settings: {
        ...settings,
        valueField: undefined,
        labelField: undefined,
        compareField: undefined,
        targetField: undefined,
        columns: undefined,
      },
    });

  const handleTableSource = (mode) => {
    if (mode === "manual") {
      onUpdate(widget.id, {
        apiId: null,
        apiName: null,
        apiLabel: null,
        apiUnavailable: false,
        tableColumns: widget.tableColumns?.length ? widget.tableColumns : ["Name", "Value"],
        tableData: widget.tableData?.length ? widget.tableData : [["", ""]],
        settings: { ...settings, source: "manual" },
      });
    } else {
      set({ source: "system" });
    }
  };

  const toggleColumn = (name) => {
    const all = fields.map((f) => f.name);
    const current = Array.isArray(settings.columns) && settings.columns.length ? settings.columns : all;
    const next = current.includes(name) ? current.filter((c) => c !== name) : [...current, name];
    const ordered = all.filter((c) => next.includes(c));
    if (ordered.length === 0) return;
    set({ columns: ordered.length === all.length ? undefined : ordered });
  };

  const hasData = !manual && widget.apiName && !loading && !error && rows.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {isTable && <SourceToggle value={manual ? "manual" : "system"} onChange={handleTableSource} />}

      {manual ? (
        <StaticTableEditor
          columns={widget.tableColumns || []}
          rows={widget.tableData || []}
          onChange={(tableColumns, tableData, kind) =>
            onUpdate(
              widget.id,
              { tableColumns, tableData },
              kind ? `${widget.id}:table-${kind}` : undefined
            )
          }
        />
      ) : (
        <div>
          <SourcePicker widget={widget} onChange={handleSource} />
          {widget.apiName && (
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              {loading && "Loading information…"}
              {!loading && error}
              {!loading && !error && `${rows.length.toLocaleString()} rows found`}
            </p>
          )}
        </div>
      )}

      {hasData && widget.type === "card" && (
        <>
          <FieldSelect
            label="Number to show"
            value={picked.valueField}
            fields={numberFields}
            onChange={(valueField) => set({ valueField })}
          />
          <SimpleSelect
            label="Calculate"
            value={settings.aggregate || "auto"}
            options={AGGREGATE_OPTIONS}
            onChange={(aggregate) => set({ aggregate })}
            helperText="Automatic shows the value, or the total when there are many rows"
          />
          <FieldSelect
            label="Compare with"
            value={settings.compareField}
            fields={numberFields}
            noneLabel="Don't compare"
            onChange={(compareField) => set({ compareField })}
            helperText="Shows the change, like +12%"
          />
          {settings.compareField && (
            <FloatingCheckbox
              id={`lower-is-better-${widget.id}`}
              label="Lower is better (shows a drop in green)"
              checked={Boolean(settings.lowerIsBetter)}
              onChange={(e) => set({ lowerIsBetter: e.target.checked })}
            />
          )}
        </>
      )}

      {hasData && widget.type === "graph" && (
        <>
          <ChartTypePicker
            value={widget.variant}
            onChange={(variant) => onUpdate(widget.id, { variant })}
          />
          <FieldSelect
            label="Number to show"
            value={picked.valueField}
            fields={numberFields}
            onChange={(valueField) => set({ valueField })}
          />
          <FieldSelect
            label="Group by"
            value={picked.labelField}
            fields={fields}
            onChange={(labelField) => set({ labelField })}
          />
        </>
      )}

      {hasData && widget.type === "leaderboard" && (
        <>
          <FieldSelect
            label="Rank by"
            value={picked.valueField}
            fields={numberFields}
            onChange={(valueField) => set({ valueField })}
          />
          <FieldSelect
            label="Name"
            value={picked.labelField}
            fields={fields}
            onChange={(labelField) => set({ labelField })}
          />
          <SimpleSelect
            label="How many"
            value={Number(settings.limit) || 5}
            options={LIMIT_OPTIONS}
            onChange={(limit) => set({ limit: Number(limit) })}
          />
        </>
      )}

      {hasData && widget.type === "progress" && (
        <>
          <FieldSelect
            label="Name"
            value={picked.labelField}
            fields={fields}
            onChange={(labelField) => set({ labelField })}
          />
          <FieldSelect
            label="Progress value"
            value={picked.valueField}
            fields={numberFields}
            onChange={(valueField) => set({ valueField })}
          />
          <FieldSelect
            label="Out of"
            value={settings.targetField}
            fields={numberFields}
            noneLabel="Compare to the biggest value"
            onChange={(targetField) => set({ targetField })}
            helperText="A target or total for each row, if there is one"
          />
          <SimpleSelect
            label="How many"
            value={Number(settings.limit) || 8}
            options={LIMIT_OPTIONS}
            onChange={(limit) => set({ limit: Number(limit) })}
          />
        </>
      )}

      {hasData && isTable && (
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Columns to show</div>
          <div className="flex flex-col gap-2">
            {fields.map((field) => {
              const checked =
                Array.isArray(settings.columns) && settings.columns.length
                  ? settings.columns.includes(field.name)
                  : true;
              return (
                <FloatingCheckbox
                  key={field.name}
                  id={`column-${widget.id}-${field.name}`}
                  label={field.label}
                  checked={checked}
                  onChange={() => toggleColumn(field.name)}
                />
              );
            })}
          </div>
        </div>
      )}

      {(hasData || manual) && (
        <SimpleSelect
          label="Show numbers as"
          value={settings.format || "number"}
          options={FORMAT_OPTIONS}
          onChange={(format) => set({ format })}
        />
      )}

      {!manual && widget.apiName && (
        <SimpleSelect
          label="Auto refresh"
          value={Number(widget.refreshInterval) || 0}
          options={REFRESH_OPTIONS}
          onChange={(value) => onUpdate(widget.id, { refreshInterval: Number(value) || null })}
        />
      )}
    </div>
  );
};

export default DataTab;