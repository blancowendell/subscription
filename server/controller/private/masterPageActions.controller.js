const { STATUS_LOG } = require("../../services/repository/enum/enums");
const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonSuccess,
  JsonWarningResponse,
  MessageStatus,
} = require("../../services/repository/response");
const {
  Check,
  SelectStatement,
  TransactionWithConnection,
} = require("../../services/connections/sqlhelper");
const { GetCurrentDatetime } = require("../../services/repository/customhelper");
const { validateOrLink } = require("../../services/utility/validator");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

const AUDIT_MODULE = "Master Page Actions";

const VALID_STATUS = ["ACTIVE", "INACTIVE"];

const handleError = (res, error) => {
  console.error("Master Page Actions Error:", error);
  const msg = error.message || error.sqlMessage || "Unknown error";
  if (msg.startsWith("VALIDATION: ")) return res.status(400).json(JsonWarningResponse(msg.replace("VALIDATION: ", "")));
  if (msg.startsWith("DUPLICATE: ")) return res.status(409).json(JsonWarningResponse(msg.replace("DUPLICATE: ", "")));
  return res.status(500).json(JsonErrorResponse(msg));
};

// Input mistakes (VALIDATION / DUPLICATE) aren't audit events
const shouldAuditFailure = (error) => {
  const msg = error?.message || "";
  return !msg.startsWith("VALIDATION: ") && !msg.startsWith("DUPLICATE: ");
};

// Active action codes on one page, e.g. ["APPROVE", "EDIT", "VIEW"]
const loadActiveActionCodes = async (connection, pageId) => {
  const [rows] = await connection.execute(
    `SELECT a.mac_code
       FROM master_page_actions pa
       JOIN master_actions a ON a.mac_id = pa.mpa_action_id
      WHERE pa.mpa_page_id = ? AND pa.mpa_status = 'ACTIVE'
      ORDER BY a.mac_code`,
    [pageId],
  );
  return rows.map((r) => r.mac_code);
};

const SELECT_PAGE_ACTIONS = `
  SELECT pa.mpa_id AS id,
         pa.mpa_page_id AS pageId,
         p.mp_code AS pageCode,
         p.mp_name AS pageName,
         pa.mpa_action_id AS actionId,
         a.mac_code AS actionCode,
         a.mac_name AS actionName,
         CONCAT(p.mp_code, '.', LOWER(a.mac_code)) AS permissionKey,
         pa.mpa_status AS status,
         pa.mpa_create_date AS createDate,
         pa.mpa_create_by AS createBy
    FROM master_page_actions pa
    JOIN master_pages p ON p.mp_id = pa.mpa_page_id
    JOIN master_actions a ON a.mac_id = pa.mpa_action_id`;

// GET /load-master_page_actions?page_id=&status=
const loadMasterPageActions = async (req, res) => {
  try {
    const { page_id, status } = req.query;
    const where = [];
    const params = [];

    if (page_id) {
      where.push("pa.mpa_page_id = ?");
      params.push(page_id);
    }
    if (status) {
      where.push("pa.mpa_status = ?");
      params.push(status);
    }

    let sql = SELECT_PAGE_ACTIONS;
    if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
    sql += " ORDER BY p.mp_sort_order, p.mp_id, a.mac_sort_order, a.mac_id";

    const rows = await Check(SelectStatement(sql, params));
    return res.json(JsonDataResponse(rows));
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /get-master_page_actions/:id
const getMasterPageActions = async (req, res) => {
  try {
    const required = {
      id: "ID Number is required",
    };
    if (!validateOrLink(req, res, required)) return;

    const { id } = req.params;
    const rows = await Check(SelectStatement(`${SELECT_PAGE_ACTIONS} WHERE pa.mpa_id = ?`, [id]));

    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse(`Page action ID "${id}" does not exist.`));
    }
    return res.json(JsonDataResponse(rows));
  } catch (error) {
    return handleError(res, error);
  }
};

// POST /add-master_page_actions
// Sync: body { pageId, actionIds: [] }
// Listed actions become ACTIVE (inserted if new). Unlisted ones become INACTIVE.
// Nothing is hard-deleted, so existing access rights are kept if an action comes back.
const addMasterPageActions = async (req, res) => {
  const pageId = Number(req.body?.pageId);

  // Filled inside the transaction for the audit log
  const audit = { pageCode: null, before: [], after: [] };

  try {
    const required = {
      pageId: "Page ID is required",
    };
    if (!validateOrLink(req, res, required)) return;

    if (!Array.isArray(req.body.actionIds)) {
      return res.status(400).json(JsonWarningResponse("actionIds must be an array."));
    }
    const actionIds = [...new Set(req.body.actionIds.map(Number).filter(Boolean))];

    const create_date = GetCurrentDatetime();
    const create_by = req.session.user.fullname;

    await TransactionWithConnection(async (connection) => {
      const [page] = await connection.execute(
        `SELECT mp_code FROM master_pages WHERE mp_id = ?`,
        [pageId],
      );
      if (page.length === 0) {
        throw new Error(`VALIDATION: Page ID "${pageId}" does not exist.`);
      }
      audit.pageCode = page[0].mp_code;

      audit.before = await loadActiveActionCodes(connection, pageId);

      if (actionIds.length > 0) {
        const [found] = await connection.query(
          `SELECT mac_id FROM master_actions WHERE mac_id IN (?) AND mac_status = 'ACTIVE'`,
          [actionIds],
        );
        if (found.length !== actionIds.length) {
          throw new Error("VALIDATION: One or more actions do not exist or are inactive.");
        }

        const values = actionIds.map((actionId) => [
          pageId,
          actionId,
          STATUS_LOG.ACTIVE,
          create_date,
          create_by,
        ]);
        await connection.query(
          `INSERT INTO master_page_actions
             (mpa_page_id, mpa_action_id, mpa_status, mpa_create_date, mpa_create_by)
           VALUES ?
           ON DUPLICATE KEY UPDATE mpa_status = 'ACTIVE'`,
          [values],
        );

        await connection.query(
          `UPDATE master_page_actions
              SET mpa_status = 'INACTIVE'
            WHERE mpa_page_id = ? AND mpa_action_id NOT IN (?)`,
          [pageId, actionIds],
        );
      } else {
        await connection.execute(
          `UPDATE master_page_actions SET mpa_status = 'INACTIVE' WHERE mpa_page_id = ?`,
          [pageId],
        );
      }

      audit.after = await loadActiveActionCodes(connection, pageId);
    });

    const added = audit.after.filter((c) => !audit.before.includes(c));
    const removed = audit.before.filter((c) => !audit.after.includes(c));

    if (added.length > 0 || removed.length > 0) {
      const parts = [];
      if (added.length) parts.push(`enabled ${added.join(", ")}`);
      if (removed.length) parts.push(`disabled ${removed.join(", ")}`);

      logAudit(req, {
        module: AUDIT_MODULE,
        action: "UPDATE",
        entity: "master_page_actions",
        entityId: pageId,
        referenceNo: audit.pageCode,
        before: { actions: audit.before },
        after: { actions: audit.after, enabled: added, disabled: removed },
        remarks: `Page ${audit.pageCode} actions: ${parts.join("; ")}`,
      });
    }

    return res.json(JsonSuccess());
  } catch (error) {
    if (shouldAuditFailure(error)) {
      logAudit(req, {
        module: AUDIT_MODULE,
        action: "UPDATE",
        status: "FAILED",
        entity: "master_page_actions",
        entityId: pageId || null,
        referenceNo: audit.pageCode,
        error,
        remarks: "Page actions not saved — transaction rolled back",
      });
    }

    return handleError(res, error);
  }
};

// PUT /edit-master_page_actions/:id
// body: { status }
const editMasterPageActions = async (req, res) => {
  const { id } = req.params;
  let permissionKey = null;
  let previousStatus = null;

  try {
    const required = {
      id: "ID Number is required",
      status: "Status is required",
    };
    if (!validateOrLink(req, res, required)) return;

    const { status } = req.body;

    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json(JsonWarningResponse("Status must be ACTIVE or INACTIVE."));
    }

    await TransactionWithConnection(async (connection) => {
      const [existing] = await connection.execute(
        `SELECT pa.mpa_status,
                CONCAT(p.mp_code, '.', LOWER(a.mac_code)) AS permission_key
           FROM master_page_actions pa
           JOIN master_pages p ON p.mp_id = pa.mpa_page_id
           JOIN master_actions a ON a.mac_id = pa.mpa_action_id
          WHERE pa.mpa_id = ?`,
        [id],
      );
      if (existing.length === 0) {
        throw new Error(`VALIDATION: Page action ID "${id}" does not exist.`);
      }

      permissionKey = existing[0].permission_key;
      previousStatus = existing[0].mpa_status;

      if (existing[0].mpa_status === status) {
        throw new Error(`VALIDATION: ${MessageStatus.EXIST}`);
      }

      await connection.execute(
        `UPDATE master_page_actions SET mpa_status = ? WHERE mpa_id = ?`,
        [status, id],
      );
    });

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: "master_page_actions",
      entityId: id,
      referenceNo: permissionKey,
      before: { permission_key: permissionKey, status: previousStatus },
      after: { permission_key: permissionKey, status },
      remarks: `Page action ${permissionKey} ${status === "ACTIVE" ? "enabled" : "disabled"}`,
    });

    return res.json(JsonSuccess());
  } catch (error) {
    if (shouldAuditFailure(error)) {
      logAudit(req, {
        module: AUDIT_MODULE,
        action: "UPDATE",
        status: "FAILED",
        entity: "master_page_actions",
        entityId: id ?? null,
        referenceNo: permissionKey,
        error,
        remarks: "Page action not changed",
      });
    }

    return handleError(res, error);
  }
};

module.exports = {
  loadMasterPageActions,
  getMasterPageActions,
  addMasterPageActions,
  editMasterPageActions,
};