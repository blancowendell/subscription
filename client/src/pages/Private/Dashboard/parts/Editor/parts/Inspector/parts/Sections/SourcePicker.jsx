import React, { useMemo, useState } from "react";
import FloatingSelect from "../../../../../../../../../components/Forms/FloatingSelect";
import useDataSources from "../../../../../../utils/useDataSources";

const optionLabel = (source) =>
  source.category ? `${source.label} (${source.category})` : source.label || source.name;

// "Information": data sources by friendly name, searchable by name, group or description
const SourcePicker = ({ widget, onChange }) => {
  const { sources, loading, error, reload } = useDataSources();
  const [search, setSearch] = useState("");

  const selected = sources.find((s) => s.id === widget.apiId) || null;

  const options = useMemo(() => {
    const term = search.trim().toLowerCase();
    const sorted = [...sources].sort(
      (a, b) =>
        String(a.category || "").localeCompare(String(b.category || "")) ||
        String(a.label || "").localeCompare(String(b.label || ""))
    );
    const matches = term
      ? sorted.filter((s) =>
          [s.label, s.category, s.description].some((v) =>
            String(v || "").toLowerCase().includes(term)
          )
        )
      : sorted;

    // Keep the current choice in the list even when the search hides it
    const list = selected && !matches.includes(selected) ? [selected, ...matches] : matches;
    return list.map((s) => ({ value: String(s.id), label: optionLabel(s) }));
  }, [sources, search, selected]);

  return (
    <div>
      <FloatingSelect
        label={loading ? "Loading information…" : "Information"}
        value={selected ? String(selected.id) : ""}
        onChange={(e) =>
          onChange(sources.find((s) => String(s.id) === e.target.value) || null)
        }
        onRemoteSearch={setSearch}
        options={options}
      />

      {widget.apiUnavailable && (
        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
          The information this widget used was removed. Pick another.
        </p>
      )}

      {selected?.description && (
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          {selected.description}
        </p>
      )}

      {error && (
        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
          {error}{" "}
          <button type="button" onClick={reload} className="underline">
            Try again
          </button>
        </p>
      )}
    </div>
  );
};

export default SourcePicker;