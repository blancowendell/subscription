const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonWarningResponse,
  JsonSuccess,
} = require("../../services/repository/response");
const { GetCurrentDatetime } = require("../../services/repository/customhelper");
const { DataModeling, Check, CheckParam, Query, SelectStatement } = require("../../services/connections/sqlhelper");
const { RESET_PERIODS, resetRuleError, previewNext } = require("../../services/repository/sequence");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

const AUDIT_MODULE = "Sequences";
const AUDIT_ENTITY = "maintenance_sequence";

const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

const toFlag = (v) => (v === true || v === 1 || v === "1" || v === "true" ? 1 : 0);

// Adds the next value and whether the sequence has issued anything yet
const withPreview = (rows) =>
  DataModeling(rows, "ms_").map((seq, i) => ({
    ...seq,
    preview: previewNext(rows[i]),
    in_use: rows[i].ms_current_number !== null,
  }));

const validateFormat = (body) => {
  const startNumber = Number(body.start_number);
  const padding = Number(body.padding_length);

  if (!Number.isInteger(startNumber) || startNumber < 0) return "Start number must be a whole number, 0 or higher.";
  if (!Number.isInteger(padding) || padding < 1 || padding > 10) return "Padding length must be between 1 and 10.";
  if (!RESET_PERIODS.includes(body.reset_period)) return "Invalid reset period.";

  return resetRuleError({
    reset_period: body.reset_period,
    include_year: toFlag(body.include_year),
    include_month: toFlag(body.include_month),
    include_day: toFlag(body.include_day),
  });
};

//#region Sequence Maintenance

// GET /load-sequence — every sequence, for the maintenance page
const loadSequence = async (req, res) => {
  try {
    const rows = await CheckParam(`SELECT * FROM maintenance_sequence ORDER BY ms_name ASC`, []);
    return res.json(JsonDataResponse(rows.length ? withPreview(rows) : []));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message || error));
  }
};

// GET /load-list-sequence — active sequences, for dropdowns in other modules
const loadListSequence = async (req, res) => {
  try {
    const rows = await CheckParam(
      `SELECT * FROM maintenance_sequence WHERE ms_status = 'ACTIVE' ORDER BY ms_name ASC`,
      [],
    );

    const data = rows.length
      ? withPreview(rows).map(({ id, code, name, preview }) => ({ id, code, name, preview }))
      : [];

    return res.json(JsonDataResponse(data));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message || error));
  }
};

// GET /get-sequence/:id
const getSequence = async (req, res) => {
  try {
    const rows = await CheckParam(`SELECT * FROM maintenance_sequence WHERE ms_id = ?`, [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse("Sequence not found."));
    }
    return res.json(JsonDataResponse(withPreview(rows)));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message || error));
  }
};

// POST /add-sequence
const addSequence = async (req, res) => {
  const body = req.body || {};

  try {
    const code = String(body.code || "").trim().toUpperCase();
    const name = String(body.name || "").trim();

    if (!CODE_PATTERN.test(code)) {
      return res
        .status(400)
        .json(JsonWarningResponse("Code must start with a letter and use only letters, numbers and underscores."));
    }
    if (!name) {
      return res.status(400).json(JsonWarningResponse("Name is required."));
    }

    const formatError = validateFormat(body);
    if (formatError) {
      return res.status(400).json(JsonWarningResponse(formatError));
    }

    const codeTaken = await Check(SelectStatement(`SELECT ms_id FROM maintenance_sequence WHERE ms_code = ?`, [code]));
    if (codeTaken.length > 0) {
      return res.status(409).json(JsonWarningResponse(`A sequence with the code "${code}" already exists.`));
    }

    const includeYear = toFlag(body.include_year);
    const createBy = req.session?.user?.fullname || "system";

    const result = await Query(
      `INSERT INTO maintenance_sequence
         (ms_company_id, ms_code, ms_name, ms_prefix, ms_separator, ms_start_number, ms_padding_length,
          ms_include_year, ms_year_format, ms_include_month, ms_include_day, ms_reset_period,
          ms_status, ms_create_at, ms_create_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      [
        body.company_id || null,
        code,
        name,
        body.prefix || "",
        body.separator ?? "",
        Number(body.start_number),
        Number(body.padding_length),
        includeYear,
        includeYear ? body.year_format || "YYYY" : null,
        toFlag(body.include_month),
        toFlag(body.include_day),
        body.reset_period,
        GetCurrentDatetime(),
        createBy,
      ],
    );

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      entity: AUDIT_ENTITY,
      entityId: result?.insertId ?? null,
      referenceNo: code,
      after: { code, name, prefix: body.prefix, reset_period: body.reset_period },
      remarks: `Sequence created: ${name} (${code})`,
    });

    return res.json(JsonSuccess());
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.sqlMessage || error.message || error));
  }
};

// PUT /edit-sequence/:id
// Name, padding and status can always change. The format can only change before
// the sequence has issued anything, so existing values keep their meaning.
const editSequence = async (req, res) => {
  const body = req.body || {};

  try {
    const { id } = req.params;

    const rows = await CheckParam(`SELECT * FROM maintenance_sequence WHERE ms_id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse("Sequence not found."));
    }
    const before = rows[0];
    const inUse = before.ms_current_number !== null;

    const name = String(body.name || "").trim();
    if (!name) {
      return res.status(400).json(JsonWarningResponse("Name is required."));
    }

    const status = body.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    const updateAt = GetCurrentDatetime();
    const updateBy = req.session?.user?.fullname || "system";

    if (inUse) {
      const padding = Number(body.padding_length);
      if (!Number.isInteger(padding) || padding < 1 || padding > 10) {
        return res.status(400).json(JsonWarningResponse("Padding length must be between 1 and 10."));
      }

      await Query(
        `UPDATE maintenance_sequence
            SET ms_name = ?, ms_padding_length = ?, ms_status = ?, ms_update_at = ?, ms_update_by = ?
          WHERE ms_id = ?`,
        [name, padding, status, updateAt, updateBy, id],
      );
    } else {
      const formatError = validateFormat(body);
      if (formatError) {
        return res.status(400).json(JsonWarningResponse(formatError));
      }

      const includeYear = toFlag(body.include_year);

      await Query(
        `UPDATE maintenance_sequence
            SET ms_name = ?, ms_prefix = ?, ms_separator = ?, ms_start_number = ?, ms_padding_length = ?,
                ms_include_year = ?, ms_year_format = ?, ms_include_month = ?, ms_include_day = ?,
                ms_reset_period = ?, ms_status = ?, ms_update_at = ?, ms_update_by = ?
          WHERE ms_id = ?`,
        [
          name,
          body.prefix || "",
          body.separator ?? "",
          Number(body.start_number),
          Number(body.padding_length),
          includeYear,
          includeYear ? body.year_format || "YYYY" : null,
          toFlag(body.include_month),
          toFlag(body.include_day),
          body.reset_period,
          status,
          updateAt,
          updateBy,
          id,
        ],
      );
    }

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: AUDIT_ENTITY,
      entityId: id,
      referenceNo: before.ms_code,
      before: { name: before.ms_name, padding_length: before.ms_padding_length, status: before.ms_status },
      after: { name, padding_length: Number(body.padding_length), status },
      remarks: `Sequence updated: ${name} (${before.ms_code})`,
    });

    return res.json(JsonSuccess());
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.sqlMessage || error.message || error));
  }
};

module.exports = {
  loadSequence,
  loadListSequence,
  getSequence,
  addSequence,
  editSequence,
};

//#endregion