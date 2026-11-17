const System = {
  system_settings: {
  tablename: "system_settings",
  prefix: "ss",
  prefix_: "ss_",
  insertColumns: [
      "key",
      "value",
      "type",
      "description",
      "company_id",
      "warehouse_id",
      "created_by",
      "updated_by",
      "created_at",
      "updated_at"
    ],
  selectColumns: [
      "ss_id",
      "ss_key",
      "ss_value",
      "ss_type",
      "ss_description",
      "ss_company_id",
      "ss_warehouse_id",
      "ss_created_by",
      "ss_updated_by",
      "ss_created_at",
      "ss_updated_at"
    ],
  selectOptionColumns: {
    id: "ss_id",
    key: "ss_key",
    value: "ss_value",
    type: "ss_type",
    description: "ss_description",
    company_id: "ss_company_id",
    warehouse_id: "ss_warehouse_id",
    created_by: "ss_created_by",
    updated_by: "ss_updated_by",
    created_at: "ss_created_at",
    updated_at: "ss_updated_at"
  },
  updateOptionColumns: {
    id: "id",
    key: "key",
    value: "value",
    type: "type",
    description: "description",
    company_id: "company_id",
    warehouse_id: "warehouse_id",
    created_by: "created_by",
    updated_by: "updated_by",
    created_at: "created_at",
    updated_at: "updated_at"
  },
  selectDateFormatColumns: {
    created_at: "REPLACE(REPLACE(ss_created_at, 'T', ' '), 'Z', '') AS ss_created_at",
    updated_at: "REPLACE(REPLACE(ss_updated_at, 'T', ' '), 'Z', '') AS ss_updated_at"
  },
  selectMiscColumns: {

  }
},
};

exports.System = System;