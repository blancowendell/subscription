const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonSuccess,
} = require("../../services/repository/response");
const {
  SelectParameter,
  Transaction,
  TransactionWithReturn,
} = require("../../services/connections/sqlhelper");
const { getRequestAccessId, canUseDataSource } = require("../../services/dashboard/apiAccess");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

const AUDIT_MODULE = "Dashboard";
const AUDIT_ENTITY = "maintenance_dashboards";

const GRID_COLS = 12;
const MAX_WIDGETS = 50;
const MAX_DASHBOARDS = 20;
const WIDGET_TYPES = ["card", "graph", "table", "text", "progress", "leaderboard"];

// Users log in from either table, and their ids can overlap,
// so every dashboard is owned by (source + id).
const USER_SOURCES = ["MASTER", "EMPLOYEE"];

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

// mysql2 returns JSON columns parsed, mysql returns strings — handle both
const parseJson = (value, fallback) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const toInt = (value, min, max, fallback) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const cleanTitle = (title, fallback) => String(title || "").trim().slice(0, 100) || fallback;

const getOwner = (req) => {
  const user = req.session?.user;
  if (!user?.id || !USER_SOURCES.includes(user.user_source)) return null;
  return {
    id: Number(user.id),
    source: user.user_source,
    role: user.access_type || null,
    name: String(user.fullname || user.username || "user").slice(0, 50),
  };
};

const notLoggedIn = (res) =>
  res.status(401).json(JsonErrorResponse("Your session has ended. Please log in again."));

// Compact widget snapshot for the audit log (no table data / large payloads)
const summarizeWidget = (w) => ({
  type: w.type,
  title: w.title || "",
  x: w.x,
  y: w.y,
  w: w.w,
  h: w.h,
  api_id: w.apiId ?? null,
});

// Current widgets of a dashboard, in the same compact shape
const loadWidgetSummary = async (dashboardId) => {
  const rows = await query(
    `SELECT dw.dw_type, dw.dw_title, dw.dw_position_x, dw.dw_position_y,
            dw.dw_width, dw.dw_height, dwc.dwc_api_id
     FROM dashboard_widgets dw
     LEFT JOIN dashboard_widget_configs dwc ON dwc.dwc_widget_id = dw.dw_id
     WHERE dw.dw_dashboard_id = ?
     ORDER BY dw.dw_position_y, dw.dw_position_x`,
    [dashboardId]
  );
  return rows.map((r) =>
    summarizeWidget({
      type: r.dw_type,
      title: r.dw_title,
      x: r.dw_position_x,
      y: r.dw_position_y,
      w: r.dw_width,
      h: r.dw_height,
      apiId: r.dwc_api_id,
    })
  );
};

const listOwned = (owner) =>
  query(
    `SELECT md_id, md_title, md_sort
     FROM maintenance_dashboards
     WHERE md_user_id = ? AND md_user_source = ?
     ORDER BY md_sort, md_id`,
    [owner.id, owner.source]
  );

const findOwned = async (owner, dashboardId) => {
  const rows = await query(
    `SELECT md_id, md_title
     FROM maintenance_dashboards
     WHERE md_id = ? AND md_user_id = ? AND md_user_source = ?
     LIMIT 1`,
    [Number(dashboardId), owner.id, owner.source]
  );
  return rows[0] || null;
};

const insertDashboard = async (owner, title) => {
  const existing = await listOwned(owner);
  if (existing.length >= MAX_DASHBOARDS) {
    const error = new Error(`You can have up to ${MAX_DASHBOARDS} dashboards.`);
    error.status = 400;
    throw error;
  }

  const nextSort = existing.reduce((max, d) => Math.max(max, Number(d.md_sort) || 0), 0) + 1;
  const finalTitle = cleanTitle(title, existing.length ? `Dashboard ${existing.length + 1}` : "My dashboard");

  const result = await TransactionWithReturn([
    {
      sql: `INSERT INTO maintenance_dashboards
              (md_user_id, md_user_source, md_user_type, md_title, md_owner, md_sort, md_created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      values: [owner.id, owner.source, owner.role, finalTitle, owner.name, nextSort],
    },
  ]);

  let id = result?.insertId;
  if (!id) {
    const latest = await query(
      `SELECT md_id FROM maintenance_dashboards
       WHERE md_user_id = ? AND md_user_source = ?
       ORDER BY md_id DESC LIMIT 1`,
      [owner.id, owner.source]
    );
    id = latest[0]?.md_id;
  }

  return { id: Number(id), title: finalTitle };
};

// GET /dashboard/list — the user's dashboards in tab order
const listDashboards = async (req, res) => {
  try {
    const owner = getOwner(req);
    if (!owner) return notLoggedIn(res);

    const rows = await listOwned(owner);
    return res.json(JsonDataResponse(rows.map((r) => ({ id: r.md_id, title: r.md_title }))));
  } catch (error) {
    console.error("List dashboards error:", error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /dashboard/create — { title? }
const createDashboard = async (req, res) => {
  try {
    const owner = getOwner(req);
    if (!owner) return notLoggedIn(res);

    const created = await insertDashboard(owner, req.body?.title);

    // AUDIT — SUCCESS
    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      entity: AUDIT_ENTITY,
      entityId: created.id,
      referenceNo: created.title,
      before: null,
      after: { id: created.id, title: created.title, owner: owner.name },
      remarks: `Dashboard "${created.title}" created`,
    });

    return res.json(JsonDataResponse(created));
  } catch (error) {
    console.error("Create dashboard error:", error);

    // AUDIT — FAILURE
    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      status: "FAILED",
      entity: AUDIT_ENTITY,
      entityId: null,
      referenceNo: req.body?.title ?? null,
      before: null,
      error,
      remarks: "Dashboard not created",
    });

    return res.status(error.status || 500).json(JsonErrorResponse(error.message));
  }
};

// DELETE /dashboard/:id
const deleteDashboard = async (req, res) => {
  // Captured before the delete for the audit log
  let dashboardBefore = null;
  let widgetsBefore = null;

  try {
    const owner = getOwner(req);
    if (!owner) return notLoggedIn(res);

    const dashboard = await findOwned(owner, req.params.id);
    if (!dashboard) return res.status(404).json(JsonErrorResponse("Dashboard not found."));

    // AUDIT BEFORE — dashboard + its widgets (about to be deleted)
    dashboardBefore = { id: dashboard.md_id, title: dashboard.md_title };
    widgetsBefore = await loadWidgetSummary(dashboard.md_id);

    // Widgets first, in case the foreign key isn't set to cascade
    await Transaction([
      {
        sql: `DELETE FROM dashboard_widgets WHERE dw_dashboard_id = ?`,
        values: [dashboard.md_id],
      },
      {
        sql: `DELETE FROM maintenance_dashboards WHERE md_id = ?`,
        values: [dashboard.md_id],
      },
    ]);

    // AUDIT — SUCCESS
    logAudit(req, {
      module: AUDIT_MODULE,
      action: "DELETE",
      entity: AUDIT_ENTITY,
      entityId: dashboard.md_id,
      referenceNo: dashboard.md_title,
      before: {
        dashboard: dashboardBefore,
        widgets_count: widgetsBefore.length,
        widgets: widgetsBefore,
      },
      after: null,
      remarks: `Dashboard "${dashboard.md_title}" deleted with ${widgetsBefore.length} widget(s)`,
    });

    return res.json(JsonSuccess("Dashboard deleted."));
  } catch (error) {
    console.error("Delete dashboard error:", error);

    // AUDIT — FAILURE
    logAudit(req, {
      module: AUDIT_MODULE,
      action: "DELETE",
      status: "FAILED",
      entity: AUDIT_ENTITY,
      entityId: req.params?.id ?? null,
      referenceNo: dashboardBefore?.title ?? null,
      before: dashboardBefore
        ? { dashboard: dashboardBefore, widgets: widgetsBefore }
        : null,
      error,
      remarks: `Dashboard not deleted (#${req.params?.id ?? "?"})`,
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// GET /dashboard/load-layout?id= — one dashboard's widgets (first dashboard if no id)
const loadLayout = async (req, res) => {
  try {
    const owner = getOwner(req);
    if (!owner) return notLoggedIn(res);

    let dashboard;
    if (req.query.id) {
      dashboard = await findOwned(owner, req.query.id);
      if (!dashboard) return res.status(404).json(JsonErrorResponse("Dashboard not found."));
    } else {
      dashboard = (await listOwned(owner))[0] || null;
    }

    if (!dashboard) {
      return res.json(JsonDataResponse({ dashboard: null, widgets: [] }));
    }

    const rows = await query(
      `SELECT
         dw.dw_id, dw.dw_type, dw.dw_title,
         dw.dw_position_x, dw.dw_position_y, dw.dw_width, dw.dw_height,
         dwc.dwc_card_type, dwc.dwc_content, dwc.dwc_param, dwc.dwc_api_id,
         dwc.dwc_chart_type, dwc.dwc_table_columns, dwc.dwc_table_data,
         dwc.dwc_custom_styles, dwc.dwc_refresh_interval, dwc.dwc_card_icon,
         dwc.dwc_settings,
         api.ma_api_name AS api_name,
         api.ma_name AS api_label
       FROM dashboard_widgets dw
       LEFT JOIN dashboard_widget_configs dwc ON dwc.dwc_widget_id = dw.dw_id
       LEFT JOIN maintenance_api api
         ON api.ma_id = dwc.dwc_api_id AND api.ma_status = 'ACTIVE'
       WHERE dw.dw_dashboard_id = ?
       ORDER BY dw.dw_position_y, dw.dw_position_x`,
      [dashboard.md_id]
    );

    // A widget whose data source this role may no longer use shows "no access"
    const accessId = getRequestAccessId(req);

    const widgets = await Promise.all(
      rows.map(async (row) => ({
        id: String(row.dw_id),
        type: row.dw_type,
        title: row.dw_title || "",
        x: row.dw_position_x,
        y: row.dw_position_y,
        w: row.dw_width,
        h: row.dw_height,
        apiId: row.dwc_api_id,
        apiName: row.api_name,
        apiLabel: row.api_label || row.api_name,
        apiUnavailable: Boolean(row.dwc_api_id && !row.api_name),
        apiRestricted: row.api_name ? !(await canUseDataSource(accessId, row.api_name)) : false,
        variant: row.dwc_card_type || row.dwc_chart_type || "",
        icon: row.dwc_card_icon || "",
        content: row.dwc_content || "",
        param: row.dwc_param || "",
        tableColumns: parseJson(row.dwc_table_columns, []),
        tableData: parseJson(row.dwc_table_data, []),
        refreshInterval: row.dwc_refresh_interval,
        settings: parseJson(row.dwc_settings, {}),
      }))
    );

    return res.json(
      JsonDataResponse({
        dashboard: { id: dashboard.md_id, title: dashboard.md_title },
        widgets,
      })
    );
  } catch (error) {
    console.error("Load layout error:", error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /dashboard/save-layout — { dashboardId, title, widgets }
const saveLayout = async (req, res) => {
  // Captured for the audit log
  let isNewDashboard = false;
  let targetId = null;
  let titleBefore = null;
  let widgetsBefore = null;

  try {
    const owner = getOwner(req);
    if (!owner) return notLoggedIn(res);

    const { dashboardId, title, widgets } = req.body;
    if (!Array.isArray(widgets)) {
      return res.status(400).json(JsonErrorResponse("Invalid request format"));
    }
    if (widgets.length > MAX_WIDGETS) {
      return res
        .status(400)
        .json(JsonErrorResponse(`A dashboard can have up to ${MAX_WIDGETS} widgets.`));
    }

    const invalid = widgets.find((w) => !WIDGET_TYPES.includes(w?.type));
    if (invalid) {
      return res.status(400).json(JsonErrorResponse(`Unknown widget type: ${invalid?.type}`));
    }

    // Saving with no dashboard yet creates the user's first one
    if (dashboardId) {
      const dashboard = await findOwned(owner, dashboardId);
      if (!dashboard) return res.status(404).json(JsonErrorResponse("Dashboard not found."));
      targetId = dashboard.md_id;

      // AUDIT BEFORE — current title + widgets
      titleBefore = dashboard.md_title;
      widgetsBefore = await loadWidgetSummary(targetId);
    } else {
      isNewDashboard = true;
      targetId = (await insertDashboard(owner, title)).id;
    }

    const finalTitle = cleanTitle(title, "My dashboard");

    // Replace the whole layout in one transaction
    const statements = [
      {
        sql: `UPDATE maintenance_dashboards SET md_title = ? WHERE md_id = ?`,
        values: [finalTitle, targetId],
      },
      {
        sql: `DELETE FROM dashboard_widgets WHERE dw_dashboard_id = ?`,
        values: [targetId],
      },
    ];

    const widgetsAfter = [];

    for (const widget of widgets) {
      const w = toInt(widget.w, 1, GRID_COLS, 4);
      const h = toInt(widget.h, 1, 50, 4);
      const x = toInt(widget.x, 0, GRID_COLS - w, 0);
      const y = toInt(widget.y, 0, 1000, 0);
      const variant = String(widget.variant || "");

      widgetsAfter.push(
        summarizeWidget({
          type: widget.type,
          title: String(widget.title || "").slice(0, 255),
          x,
          y,
          w,
          h,
          apiId: widget.apiId ? Number(widget.apiId) : null,
        })
      );

      statements.push({
        sql: `INSERT INTO dashboard_widgets
                (dw_dashboard_id, dw_type, dw_title, dw_position_x, dw_position_y,
                 dw_width, dw_height, dw_created_at, dw_updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        values: [targetId, widget.type, String(widget.title || "").slice(0, 255), x, y, w, h],
      });

      // LAST_INSERT_ID() = the widget just inserted on this same connection
      statements.push({
        sql: `INSERT INTO dashboard_widget_configs
                (dwc_widget_id, dwc_card_type, dwc_content, dwc_param, dwc_api_id,
                 dwc_chart_type, dwc_table_columns, dwc_table_data, dwc_custom_styles,
                 dwc_refresh_interval, dwc_card_icon, dwc_settings,
                 dwc_created_at, dwc_updated_at)
              VALUES (LAST_INSERT_ID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        values: [
          widget.type === "card" ? variant : "",
          String(widget.content || ""),
          String(widget.param || ""),
          widget.apiId ? Number(widget.apiId) : null,
          widget.type === "graph" ? variant : "",
          JSON.stringify(Array.isArray(widget.tableColumns) ? widget.tableColumns : []),
          JSON.stringify(Array.isArray(widget.tableData) ? widget.tableData : []),
          JSON.stringify({}),
          widget.refreshInterval ? toInt(widget.refreshInterval, 10, 3600, null) : null,
          String(widget.icon || ""),
          JSON.stringify(
            widget.settings && typeof widget.settings === "object" ? widget.settings : {}
          ),
        ],
      });
    }

    await Transaction(statements);

    // AUDIT — SUCCESS
    logAudit(req, {
      module: AUDIT_MODULE,
      action: isNewDashboard ? "CREATE" : "UPDATE",
      entity: AUDIT_ENTITY,
      entityId: targetId,
      referenceNo: finalTitle,
      before: isNewDashboard
        ? null
        : {
            title: titleBefore,
            widgets_count: widgetsBefore.length,
            widgets: widgetsBefore,
          },
      after: {
        title: finalTitle,
        widgets_count: widgetsAfter.length,
        widgets: widgetsAfter,
      },
      remarks: isNewDashboard
        ? `Dashboard "${finalTitle}" created via layout save (${widgetsAfter.length} widget(s))`
        : `Dashboard layout saved (${widgetsBefore.length} -> ${widgetsAfter.length} widget(s))`,
    });

    return res.json(JsonDataResponse({ id: targetId }));
  } catch (error) {
    console.error("Save layout error:", error);

    // AUDIT — FAILURE
    logAudit(req, {
      module: AUDIT_MODULE,
      action: isNewDashboard ? "CREATE" : "UPDATE",
      status: "FAILED",
      entity: AUDIT_ENTITY,
      entityId: targetId ?? req.body?.dashboardId ?? null,
      referenceNo: titleBefore ?? req.body?.title ?? null,
      before: widgetsBefore
        ? {
            title: titleBefore,
            widgets_count: widgetsBefore.length,
            widgets: widgetsBefore,
          }
        : null,
      error,
      remarks: `Dashboard layout not saved (#${targetId ?? req.body?.dashboardId ?? "?"})`,
    });

    return res.status(error.status || 500).json(JsonErrorResponse(error.message || "Internal server error"));
  }
};

// GET /dashboard/data-sources — the "Information" picker, only what this role may use
const loadDataSources = async (req, res) => {
  try {
    const accessId = getRequestAccessId(req);

    const rows = await query(
      `SELECT ma_id, ma_name, ma_api_name, ma_api_description, ma_category
       FROM maintenance_api
       WHERE ma_status = 'ACTIVE'
       ORDER BY ma_category, ma_name`
    );

    const allowed = [];
    for (const row of rows) {
      if (await canUseDataSource(accessId, row.ma_api_name)) allowed.push(row);
    }

    const sources = allowed.map((row) => ({
      id: row.ma_id,
      name: row.ma_api_name,
      label: row.ma_name || row.ma_api_name,
      description: row.ma_api_description || "",
      category: row.ma_category || "General",
    }));

    return res.json(JsonDataResponse(sources));
  } catch (error) {
    console.error("Load data sources error:", error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

module.exports = {
  listDashboards,
  createDashboard,
  deleteDashboard,
  loadLayout,
  saveLayout,
  loadDataSources,
};