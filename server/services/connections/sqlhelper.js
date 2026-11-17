const { logger, logEvents } = require("../../middleware/logger.js");
const { db } = require("./dbconnect.js");

//#region SELECT

exports.Select = (sql, callback) => {
  db.pool.query(sql)
    .then(([results]) => {
      callback(null, results);
    })
    .catch((error) => {
      console.error("Select Error:", error);
      callback(error, null);
    });
};

exports.SelectAll = async (tableName, prefix) => {
  try {
    const [result] = await db.pool.query(`SELECT * FROM ${tableName}`);
    if (prefix) {
      const data = DataModeling(result, prefix);
      return data;
    }
    return result;
  } catch (error) {
    logger.error(error);
    console.error("Error executing query:", error);

    throw error;
  }
};

exports.SelectParameter = (sql, condition, callback) => {
  db.pool.query(sql, condition)
    .then(([results]) => {
      callback(null, results);
    })
    .catch((error) => {
      logger.error(`error: ${error.message}`);
      callback(error, null);
    });
};

exports.SelectStatement = (str, data) => {
  let statement = "";
  let found = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "?") {
      statement += `'${data[found]}'`;
      found += 1;
    } else {
      statement += str[i];
    }
  }
  return statement;
};

exports.SelectWithJoinStatement = (
  baseTable,
  selectColumns = [],
  dateFormatColumns = {},
  extraColumns = [],
  joins = [],
  whereClause = "",
) => {
  // normalize extraColumns to array
  if (!Array.isArray(extraColumns)) {
    extraColumns = extraColumns ? [extraColumns] : [];
  }

  const formattedDateCols = Object.values(dateFormatColumns);
  const rawCols = selectColumns.filter((col) => {
    return !formattedDateCols.some((expr) => expr.includes(`AS ${col}`));
  });

  const allColumns = [...rawCols, ...formattedDateCols, ...extraColumns];
  const columnList = allColumns.join(", ");

  const joinSQL = Array.isArray(joins)
    ? joins
        .map((j) => `${j.type.toUpperCase()} JOIN ${j.table} ON ${j.on}`)
        .join(" ")
    : "";

  let sql = `SELECT ${columnList} FROM ${baseTable} ${joinSQL}`;
  if (whereClause) {
    sql += ` WHERE ${whereClause}`;
  }

  return sql.trim();
};

exports.SelectAllStatement = (
  tablename,
  selectColumns = [],
  dateFormatColumns = {},
) => {
  const formattedDateCols = Object.values(dateFormatColumns);

  const rawCols = selectColumns.filter((col) => {
    return !formattedDateCols.some((expr) => expr.includes(`AS ${col}`));
  });

  const allColumns = [...rawCols, ...formattedDateCols];

  const columnList = allColumns.join(", ");
  return `SELECT ${columnList} FROM ${tablename}`;
};

exports.SelectWhereStatement = (tablename, columns, condition, values) => {
  let cols = "";

  for (let i = 0; i < condition.length; i++) {
    cols += `${condition[i]} = ${values[i]} AND `;
  }

  cols = cols.slice(0, -5);

  let statement = `SELECT ${columns} FROM ${tablename} WHERE ${cols}`;

  return statement;
};

exports.SelectWhereStatementWithFormatDate = function (
  tablename,
  selectColumns = [],
  arg3 = undefined,
  arg4 = undefined,
  arg5 = undefined,
) {
  // Normalize selectColumns -> array
  let selectColsArray = [];
  if (typeof selectColumns === "string") {
    selectColsArray = selectColumns
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (Array.isArray(selectColumns)) {
    selectColsArray = selectColumns.slice();
  }

  // Detect call signature and assign dateFormatColumns / condition / values
  let dateFormatColumns = null;
  let condition = [];
  let values = [];

  // 5-arg: (table, selectCols, dateFormatCols, condition, values)
  if (Array.isArray(arg4) && Array.isArray(arg5)) {
    dateFormatColumns = arg3 || null;
    condition = arg4;
    values = arg5;
  }
  // 4-arg: (table, selectCols, condition, values)
  else if (Array.isArray(arg3) && Array.isArray(arg4)) {
    condition = arg3;
    values = arg4;
  }
  // 3-arg: (table, selectCols, condition)  -> values may be omitted
  else if (Array.isArray(arg3) && typeof arg4 === "undefined") {
    condition = arg3;
    values = [];
  }

  // Build formattedDateCols array from dateFormatColumns (support object or array or string)
  let formattedDateCols = [];
  if (dateFormatColumns) {
    if (Array.isArray(dateFormatColumns)) {
      formattedDateCols = dateFormatColumns.slice();
    } else if (typeof dateFormatColumns === "object") {
      formattedDateCols = Object.values(dateFormatColumns);
    } else if (typeof dateFormatColumns === "string") {
      formattedDateCols = [dateFormatColumns];
    }
  }

  // Build final SELECT column list
  let columnList = "";
  if (formattedDateCols.length > 0) {
    // remove duplicates where formatted alias exists
    const rawCols = selectColsArray.filter((col) => {
      const colLower = (col || "").toLowerCase();
      return !formattedDateCols.some((expr) => {
        if (typeof expr !== "string") return false;
        const lowerExpr = expr.toLowerCase();
        // check common alias patterns: AS col, AS `col`, AS "col"
        return (
          lowerExpr.includes(`as ${colLower}`) ||
          lowerExpr.includes(`as \`${colLower}\``) ||
          lowerExpr.includes(`as "${colLower}"`)
        );
      });
    });

    const allColumns = [...new Set([...rawCols, ...formattedDateCols])];
    columnList = allColumns.join(", ");
  } else {
    columnList = selectColsArray.join(", ");
  }

  // fallback to * if nothing selected
  if (!columnList || columnList.trim() === "") columnList = "*";

  // Build WHERE clause safely
  let cols = "";
  if (Array.isArray(condition) && condition.length > 0) {
    for (let i = 0; i < condition.length; i++) {
      const cond = condition[i];
      const val = values && i < values.length ? values[i] : undefined;

      if (typeof cond === "undefined" || cond === null) continue;
      if (typeof val === "undefined") continue; // skip if no corresponding value

      // handle array value -> IN (...)
      if (Array.isArray(val)) {
        const inVals = val
          .map((v) =>
            v === null
              ? "NULL"
              : typeof v === "string"
                ? `'${v.replace(/'/g, "\\'")}'`
                : v,
          )
          .join(", ");
        cols += `${cond} IN (${inVals}) AND `;
      } else {
        let valStr;
        if (val === null) valStr = "NULL";
        else if (typeof val === "string")
          valStr = `'${val.replace(/'/g, "\\'")}'`;
        else valStr = val;
        cols += `${cond} = ${valStr} AND `;
      }
    }

    if (cols.endsWith(" AND ")) cols = cols.slice(0, -5);
  }

  let statement = `SELECT ${columnList} FROM ${tablename}`;
  if (cols) statement += ` WHERE ${cols}`;

  return statement;
};

exports.SelectStatementWithArray = (str, data) => {
  let statement = "";
  let found = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "?") {
      if (Array.isArray(data[found])) {
        statement += data[found].map((val) => `'${val}'`).join(",");
      } else {
        statement += `'${data[found]}'`;
      }
      found += 1;
    } else {
      statement += str[i];
    }
  }
  return statement;
};

//#endregion

//#region INSERT

exports.Insert = (stmt, todos, callback) => {
  db.pool.query(stmt, [todos])
    .then(([results]) => {
      // Success! Pass the results back to your controller
      callback(null, results);
    })
    .catch((error) => {
      // Failure! Log the error and pass it back
      logger.error(`error: ${error.message}`);
      logEvents(error, "sqlError.log");
      callback(error, null);
    });
};

exports.InsertTable = (sql, data, callback) => {
  this.Insert(sql, data, (err, result) => {
    if (err) {
      logger.error(`error: ${err.sqlMessage}`);
      callback(err, null);
    }
    console.log(result);

    callback(null, result);
  });
};

exports.InsertStatement = (tablename, prefix, columns) => {
  let cols = "";

  columns.forEach((col) => {
    cols += `${prefix}_${col},`;
  });

  cols = cols.slice(0, -1);

  let statement = `INSERT INTO ${tablename}(${cols}) VALUES ?`;

  return statement;
};

//#endregion

//#region UPDATE

exports.Update = async (sql, data, callback) => {
  try {
    db.pool.query(sql, data, (error, results, fields) => {
      if (error) {
        logger.error(`error: ${error.sqlMessage}`);
        callback(error, null);
      }
      console.log("Rows affected:", results.affectedRows);

      callback(null, `Rows affected: ${results.affectedRows}`);
    });
  } catch (error) {
    logEvents(error, "sqlError.log");
  }
};

exports.UpdateStatement = (tablename, prefix, columns, args) => {
  console.log("tablename:", tablename);
  console.log("prefix:", prefix);
  console.log("columns:", columns);
  console.log("args:", args);
  let cols = "";
  let agrs = "";

  columns.forEach((col) => {
    cols += `${prefix}_${col} = ?,`;
  });

  args.forEach((arg) => {
    agrs += `${prefix}_${arg} = ? AND `;
  });

  cols = cols.slice(0, -1);
  agrs = agrs.slice(0, -5);

  let statement = `UPDATE ${tablename} 
  SET ${cols}
  WHERE ${agrs}`;

  return statement;
};

exports.UpdateStatementWithArrayDates = (
  tablename,
  prefix,
  columns,
  datesColumn,
  loanIdColumn,
) => {
  let cols = columns.map((col) => `${prefix}_${col} = ?`).join(", ");
  let datesPlaceholder = datesColumn.map(() => "?").join(", ");

  let statement = `UPDATE ${tablename} 
  SET ${cols} 
  WHERE ${prefix}_${datesColumn} IN (${datesPlaceholder}) AND ${prefix}_${loanIdColumn} = ?`;

  return statement;
};

exports.UpdateNoPrefixStatement = (tablename, columns, args) => {
  let cols = "";
  let agrs = "";

  columns.forEach((col) => {
    cols += `${col} = ?,`;
  });

  args.forEach((arg) => {
    agrs += `${arg} = ? AND `;
  });

  cols = cols.slice(0, -1);
  agrs = agrs.slice(0, -5);

  let statement = `UPDATE ${tablename} SET ${cols} WHERE ${agrs}`;

  return statement;
};

//#endregion

//#region DELETE

//#endregion

//#region TRANS AND COMMIT

exports.InsertStatementTransCommit = (tablename, prefix, columns) => {
  let cols = "";
  let payload = "";

  columns.forEach((col) => {
    cols += `${prefix}_${col},`;
    payload += `?,`;
  });

  cols = cols.slice(0, -1);
  payload = payload.slice(0, -1);

  let statement = `INSERT INTO ${tablename}(${cols}) VALUES (${payload})`;

  return statement;
};

exports.Transaction = async (queries) => {
  let connection;
  try {
    connection = await db.pool.getConnection();
    await connection.beginTransaction();

    const queryPromises = queries.map((query) => {
      return connection.execute(query.sql, query.values);
    });

    await Promise.all(queryPromises);
    await connection.commit();
    return true;
  } catch (error) {
    logger.error(error);
    if (connection) {
      await connection.rollback();
    }
    console.error("Error executing transaction:", error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

exports.TransactionWithReturn = async function (queries) {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const results = [];

    for (const query of queries) {
      const [result] = await connection.execute(query.sql, query.values);
      results.push(result);
    }

    await connection.commit();
    return results.length === 1 ? results[0] : results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

exports.TransactionWithConnection = async (callback) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

exports.CallStoredProcedureTransCommit = (procedureName, values) => {
  const placeholders =
    values && values.length > 0 ? values.map(() => "?").join(",") : "";
  const statement = `CALL ${procedureName}(${placeholders})`;

  return { sql: statement, values };
};

//#endregion

//#region UNIVERSAL QUERY

exports.Query = async (sql, params = [], prefix) => {
  try {
    const [result] = await db.pool.query(sql, params);
    if (sql.trim().toUpperCase().startsWith("INSERT")) {
      return { ...result, insertId: result.insertId };
    }
    if (prefix && sql.trim().toUpperCase().startsWith("SELECT")) {
      const data = this.DataModeling(result, prefix);
      return data;
    }
    return result;
  } catch (error) {
    logger.error(error);
    console.error("Error executing query:", error);
    throw error;
  }
};

//#endregion

//#region STORED PROCEDURES



//#endregion

//#region Functions

exports.CheckWithParams = async (sql, params = []) => {
  try {
    const [result] = await db.pool.query(sql, params);
    if (result.length != 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    logger.error(error);
    console.error("Error executing query:", error);
    throw error;
  }
};

exports.Check = (sql) => {
  return new Promise((resolve, reject) => {
    this.Select(sql, (error, result) => {
      if (error) {
        console.log(error);
        reject(error);
      }
      resolve(result);
    });
  });
};

exports.CheckParam = (sql, params) => {
  return new Promise((resolve, reject) => {
    this.SelectParameter(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

exports.InsertCheck = (sql, data) => {
  return new Promise((resolve, reject) => {
    this.Insert(sql, data, (error, result) => {
      if (error) {
        console.log(error);

        reject(error);
      }

      resolve(result);
    });
  });
};

exports.DataModeling = (data, prefix) => {
  return data.map((d) => {
    const formatted = {};
    for (const key in d) {
      formatted[key.replace(prefix, "")] = d[key];
    }
    return formatted;
  });
};

exports.RawData = (data) => data.map((d) => ({ ...d }));

//#endregion
