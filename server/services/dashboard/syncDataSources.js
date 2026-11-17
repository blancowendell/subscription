const { SelectParameter, Transaction } = require("../connections/sqlhelper");
const { clearAccessCache } = require("./apiAccess");

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

// "sales-total" -> "Sales total"
const toLabel = (apiName) => {
  const text = apiName.replace(/[-_]+/g, " ").trim();
  return (text.charAt(0).toUpperCase() + text.slice(1)).slice(0, 50);
};

// Every plain GET route registered on an Express router, e.g. ["sales-total", ...]
// Routes with parameters (/:id) and router-level middleware are skipped.
const listGetRoutes = (router) =>
  (router?.stack || [])
    .filter((layer) => layer.route && layer.route.methods?.get)
    .map((layer) => String(layer.route.path).replace(/^\/+/, ""))
    .filter((path) => path && !path.includes(":"));

const countAccessRows = async () => {
  const [row] = await query(`SELECT COUNT(*) AS total FROM maintenance_api_access`);
  return Number(row?.total) || 0;
};

// Keeps maintenance_api_access consistent with maintenance_api:
// - Rows of deleted data sources or deleted roles go with them (ON DELETE CASCADE).
// - First run (the table is still empty): every data source is granted to every
//   active non-system role, so dashboards people already use keep working.
// - After that, new data sources start with no roles. Grant them on the
//   Maintenance API page; the sync never grants anything back that you removed.
const syncDataSourceAccess = async () => {
  const before = await countAccessRows();
  const bootstrap = before === 0;

  if (bootstrap) {
    await Transaction([
      {
        sql: `INSERT IGNORE INTO maintenance_api_access
                (maa_api_id, maa_access_id, maa_created_by, maa_created_at)
              SELECT api.ma_id, acc.ma_id, 'Sync (first grant)', NOW()
              FROM maintenance_api api
              CROSS JOIN master_access acc
              WHERE acc.ma_status = 'ACTIVE'
                AND COALESCE(acc.ma_is_system, 0) = 0`,
        values: [],
      },
    ]);
  }

  const after = await countAccessRows();
  return { bootstrapped: bootstrap, granted: after - before };
};

// Makes maintenance_api match this system's dashboard_api routes exactly:
// - a route with no row      -> row added (ACTIVE, auto name)
// - a row with no route      -> row deleted (its access rows too)
// - a row that has its route -> left alone (name, category, status edits stay)
const syncDataSources = async (dashboardApiRouter) => {
  const apiNames = [...new Set(listGetRoutes(dashboardApiRouter))];

  // Safety: an empty route list almost certainly means the router didn't load,
  // not that every data source was removed. Refuse rather than delete everything.
  if (apiNames.length === 0) {
    throw new Error("No dashboard_api routes were found, so nothing was changed.");
  }

  const rows = await query(`SELECT ma_id, ma_api_name FROM maintenance_api`);
  const existing = new Set(rows.map((r) => String(r.ma_api_name)));
  const inRoutes = new Set(apiNames);

  const newNames = apiNames.filter((name) => !existing.has(name));
  const removedRows = rows.filter((r) => !inRoutes.has(String(r.ma_api_name)));

  const statements = [
    ...newNames.map((name) => ({
      sql: `INSERT INTO maintenance_api
              (ma_name, ma_api_name, ma_api_description, ma_category, ma_status, ma_create_date, ma_update_date)
            VALUES (?, ?, ?, 'General', 'ACTIVE', NOW(), NOW())`,
      values: [toLabel(name), name, `Data from /dashboard_api/${name}`],
    })),
    ...removedRows.map((row) => ({
      sql: `DELETE FROM maintenance_api WHERE ma_id = ?`,
      values: [row.ma_id],
    })),
  ];

  if (statements.length > 0) await Transaction(statements);

  const access = await syncDataSourceAccess();
  clearAccessCache();

  return {
    added: newNames.length,
    addedNames: newNames,
    removed: removedRows.length,
    removedNames: removedRows.map((r) => String(r.ma_api_name)),
    existing: apiNames.length - newNames.length,
    accessBootstrapped: access.bootstrapped,
    accessGranted: access.granted,
  };
};

module.exports = { syncDataSources, syncDataSourceAccess, listGetRoutes };