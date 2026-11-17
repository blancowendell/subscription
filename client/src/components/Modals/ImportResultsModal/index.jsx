import React, { useMemo, useState } from "react";
import { Modal, Button, Tag, Table, Segmented } from "antd";
import {
  CheckCircleFilled,
  ExclamationCircleFilled,
  CloseCircleFilled,
} from "@ant-design/icons";

const LEVEL_CONFIG = {
  success: { color: "success", icon: <CheckCircleFilled />, label: "Imported" },
  warning: { color: "warning", icon: <ExclamationCircleFilled />, label: "Skipped" },
  error: { color: "error", icon: <CloseCircleFilled />, label: "Failed" },
};

/**
 * Shows a per-row breakdown of a bulk import (success / warning / error),
 * so the user can see exactly which rows didn't make it in and why —
 * instead of a single generic toast.
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {Array<{row: number, level: 'success'|'warning'|'error', message?: string, customerId?: string, vendorId?: string}>} results
 * @param {string} title
 * @param {string} entityLabel - e.g. "customer", "vendor" — used in the summary line
 */
const ImportResultsModal = ({
  open,
  onClose,
  results = [],
  title = "Import Results",
  entityLabel = "row",
}) => {
  const [filter, setFilter] = useState("all");

  const counts = useMemo(() => {
    const c = { success: 0, warning: 0, error: 0 };
    results.forEach((r) => {
      if (c[r.level] !== undefined) c[r.level] += 1;
    });
    return c;
  }, [results]);

  const filteredResults = useMemo(() => {
    if (filter === "all") return results;
    return results.filter((r) => r.level === filter);
  }, [results, filter]);

  const columns = [
    {
      title: "Row",
      dataIndex: "row",
      key: "row",
      width: 70,
      sorter: (a, b) => a.row - b.row,
      defaultSortOrder: "ascend",
    },
    {
      title: "Status",
      dataIndex: "level",
      key: "level",
      width: 130,
      render: (level) => {
        const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.error;
        return (
          <Tag icon={cfg.icon} color={cfg.color}>
            {cfg.label}
          </Tag>
        );
      },
    },
    {
      title: "Details",
      key: "details",
      render: (_, record) => {
        // A row-specific message always wins — this is the descriptive text
        // most controllers now attach to every level (success, warning, error).
        if (record.message) return record.message;

        // Fallback for older/simpler success payloads that only carry an ID
        // (e.g. { row, level: "success", customerId } with no message field).
        if (record.level === "success") {
          const id = record.customerId || record.vendorId || record.id;
          return id
            ? `Created successfully — ID: ${id}`
            : "Created successfully";
        }

        return "No details provided";
      },
    },
  ];

  const allImported = counts.warning === 0 && counts.error === 0 && counts.success > 0;

  return (
    <Modal
      title={title}
      open={open}
      closable={!!onClose}
      onCancel={onClose}
      centered
      maskClosable={false}
      width={720}
      footer={[
        <Button
          key="close"
          type="primary"
          style={{
            backgroundColor: "var(--main-color)",
            color: "var(--main-text-color)",
            border: "none",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--main-hover-color)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--main-color)")
          }
          onClick={onClose}
        >
          Close
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: "0 0 12px", color: "var(--menu-text)" }}>
          {allImported
            ? `All ${counts.success} ${entityLabel}${counts.success === 1 ? "" : "s"} imported successfully.`
            : `${counts.success} imported, ${counts.warning} skipped, ${counts.error} failed.`}
        </p>

        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { label: `All (${results.length})`, value: "all" },
            { label: `Imported (${counts.success})`, value: "success" },
            { label: `Skipped (${counts.warning})`, value: "warning" },
            { label: `Failed (${counts.error})`, value: "error" },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredResults}
        rowKey={(r) => `${r.row}-${r.level}`}
        size="small"
        pagination={filteredResults.length > 10 ? { pageSize: 10 } : false}
        scroll={{ y: 320 }}
      />
    </Modal>
  );
};

export default ImportResultsModal;