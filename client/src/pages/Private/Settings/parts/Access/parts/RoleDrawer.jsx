import React, { useEffect, useState } from "react";
import { FaSave, FaTimesCircle } from "react-icons/fa";
import FloatingInput from "../../../../../../components/Forms/FloatingInput";
import Drawer from "../../../../../../components/Modals/AntdDrawer";
import ToggleStatusButton from "../../../../../../components/Buttons/ToggleStatus";
import { btnPrimary, btnSecondary } from "./roleOptions";

const NAME_MAX = 50;

// Add or edit one role (master_access row)
const RoleDrawer = ({ isOpen, role, existingNames, saving, onClose, onSave }) => {
  const editing = Boolean(role);

  const [name, setName] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  useEffect(() => {
    if (!isOpen) return;
    setName(role?.name || "");
    setStatus(role?.status || "ACTIVE");
  }, [isOpen, role]);

  const trimmed = name.trim();
  const duplicate =
    trimmed &&
    existingNames.some(
      (n) => n.toLowerCase() === trimmed.toLowerCase() && n !== (role?.name || "")
    );

  let hint = "";
  if (!trimmed) hint = "Give the role a name.";
  else if (duplicate) hint = "Another role already has this name.";

  const canSave = !saving && !hint;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    onSave({ name: trimmed, status });
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={saving ? undefined : onClose}
      title={editing ? "Edit role" : "New role"}
      width={460}
    >
      <form className="flex flex-col h-full gap-5" onSubmit={handleSubmit}>
        <div>
          <FloatingInput
            label="Role name"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
          />
          <p className="mt-1 text-[11px] text-gray-400 text-right">
            {trimmed.length}/{NAME_MAX}
          </p>
        </div>

        {editing && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Status</p>
            <ToggleStatusButton
              value={status === "ACTIVE"}
              onChange={(val) => setStatus(val ? "ACTIVE" : "INACTIVE")}
              statusOptions={[
                { label: "ACTIVE", value: true },
                { label: "INACTIVE", value: false },
              ]}
            />
            {status === "INACTIVE" && (
              <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
                Users with an inactive role can't be assigned to it anymore.
              </p>
            )}
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-slate-800 flex flex-col gap-2">
          <div className="flex justify-between gap-3">
            <button type="button" onClick={onClose} disabled={saving} className={btnSecondary}>
              <FaTimesCircle /> Cancel
            </button>
            <button type="submit" disabled={!canSave} className={btnPrimary}>
              <FaSave />
              {saving ? "Saving..." : editing ? "Save changes" : "Create role"}
            </button>
          </div>
          {hint && <p className="text-xs text-gray-500 text-right m-0">{hint}</p>}
        </div>
      </form>
    </Drawer>
  );
};

export default RoleDrawer;