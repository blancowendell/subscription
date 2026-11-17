const Maintenance = {
  maintenance_dashboards: {
  tablename: "maintenance_dashboards",
  prefix: "md",
  prefix_: "md_",
  insertColumns: [
      "user_id",
      "user_source",
      "user_type",
      "title",
      "description",
      "owner",
      "sort",
      "created_at"
    ],
  selectColumns: [
      "md_id",
      "md_user_id",
      "md_user_source",
      "md_user_type",
      "md_title",
      "md_description",
      "md_owner",
      "md_sort",
      "md_created_at"
    ],
  selectOptionColumns: {
    id: "md_id",
    user_id: "md_user_id",
    user_source: "md_user_source",
    user_type: "md_user_type",
    title: "md_title",
    description: "md_description",
    owner: "md_owner",
    sort: "md_sort",
    created_at: "md_created_at"
  },
  updateOptionColumns: {
    id: "id",
    user_id: "user_id",
    user_source: "user_source",
    user_type: "user_type",
    title: "title",
    description: "description",
    owner: "owner",
    sort: "sort",
    created_at: "created_at"
  },
  selectDateFormatColumns: {
    created_at: "REPLACE(REPLACE(md_created_at, 'T', ' '), 'Z', '') AS md_created_at"
  },
  selectMiscColumns: {

  }
},
  maintenance_widgets: {
  tablename: "maintenance_widgets",
  prefix: "mw",
  prefix_: "mw_",
  insertColumns: [
      "dashboard_id",
      "type",
      "title",
      "content",
      "api_url",
      "param",
      "headers",
      "has_actions",
      "chart_type"
    ],
  selectColumns: [
      "mw_widget_id",
      "mw_dashboard_id",
      "mw_type",
      "mw_title",
      "mw_content",
      "mw_api_url",
      "mw_param",
      "mw_x",
      "mw_y",
      "mw_width",
      "mw_height",
      "mw_headers",
      "mw_has_actions",
      "mw_chart_type",
      "mw_created_at"
    ],
  selectOptionColumns: {
    widget_id: "mw_widget_id",
    dashboard_id: "mw_dashboard_id",
    type: "mw_type",
    title: "mw_title",
    content: "mw_content",
    api_url: "mw_api_url",
    param: "mw_param",
    x: "mw_x",
    y: "mw_y",
    width: "mw_width",
    height: "mw_height",
    headers: "mw_headers",
    has_actions: "mw_has_actions",
    chart_type: "mw_chart_type",
    created_at: "mw_created_at"
  },
  updateOptionColumns: {
    widget_id: "widget_id",
    dashboard_id: "dashboard_id",
    type: "type",
    title: "title",
    content: "content",
    api_url: "api_url",
    param: "param",
    x: "x",
    y: "y",
    width: "width",
    height: "height",
    headers: "headers",
    has_actions: "has_actions",
    chart_type: "chart_type",
    created_at: "created_at"
  },
  selectDateFormatColumns: {
    created_at: "REPLACE(REPLACE(mw_created_at, 'T', ' '), 'Z', '') AS mw_created_at"
  },
  selectMiscColumns: {

  }
},
  maintenance_api: {
  tablename: "maintenance_api",
  prefix: "ma",
  prefix_: "ma_",
  insertColumns: [
      "name",
      "api_name",
      "api_description"
    ],
  selectColumns: [
      "ma_id",
      "ma_name",
      "ma_api_name",
      "ma_api_description",
      "ma_status",
      "ma_create_date",
      "ma_update_date"
    ],
  selectOptionColumns: {
    id: "ma_id",
    name: "ma_name",
    api_name: "ma_api_name",
    api_description: "ma_api_description",
    status: "ma_status",
    create_date: "ma_create_date",
    update_date: "ma_update_date"
  },
  updateOptionColumns: {
    id: "id",
    name: "name",
    api_name: "api_name",
    api_description: "api_description",
    status: "status",
    create_date: "create_date",
    update_date: "update_date"
  },
  selectDateFormatColumns: {
    create_date: "REPLACE(REPLACE(ma_create_date, 'T', ' '), 'Z', '') AS ma_create_date",
    update_date: "REPLACE(REPLACE(ma_update_date, 'T', ' '), 'Z', '') AS ma_update_date"
  },
  selectMiscColumns: {

  }
},
  maintenance_sequence: {
  tablename: "maintenance_sequence",
  prefix: "ms",
  prefix_: "ms_",
  insertColumns: [
      "company_id",
      "code",
      "name",
      "prefix",
      "separator",
      "start_number",
      "padding_length",
      "include_year",
      "year_format",
      "include_month",
      "include_day",
      "reset_period",
      "current_number",
      "period_key",
      "status",
      "create_by",
      "update_at",
      "update_by"
    ],
  selectColumns: [
      "ms_id",
      "ms_company_id",
      "ms_code",
      "ms_name",
      "ms_prefix",
      "ms_separator",
      "ms_start_number",
      "ms_padding_length",
      "ms_include_year",
      "ms_year_format",
      "ms_include_month",
      "ms_include_day",
      "ms_reset_period",
      "ms_current_number",
      "ms_period_key",
      "ms_status",
      "ms_create_at",
      "ms_create_by",
      "ms_update_at",
      "ms_update_by"
    ],
  selectOptionColumns: {
    id: "ms_id",
    company_id: "ms_company_id",
    code: "ms_code",
    name: "ms_name",
    prefix: "ms_prefix",
    separator: "ms_separator",
    start_number: "ms_start_number",
    padding_length: "ms_padding_length",
    include_year: "ms_include_year",
    year_format: "ms_year_format",
    include_month: "ms_include_month",
    include_day: "ms_include_day",
    reset_period: "ms_reset_period",
    current_number: "ms_current_number",
    period_key: "ms_period_key",
    status: "ms_status",
    create_at: "ms_create_at",
    create_by: "ms_create_by",
    update_at: "ms_update_at",
    update_by: "ms_update_by"
  },
  updateOptionColumns: {
    id: "id",
    company_id: "company_id",
    code: "code",
    name: "name",
    prefix: "prefix",
    separator: "separator",
    start_number: "start_number",
    padding_length: "padding_length",
    include_year: "include_year",
    year_format: "year_format",
    include_month: "include_month",
    include_day: "include_day",
    reset_period: "reset_period",
    current_number: "current_number",
    period_key: "period_key",
    status: "status",
    create_at: "create_at",
    create_by: "create_by",
    update_at: "update_at",
    update_by: "update_by"
  },
  selectDateFormatColumns: {
    create_at: "REPLACE(REPLACE(ms_create_at, 'T', ' '), 'Z', '') AS ms_create_at",
    update_at: "REPLACE(REPLACE(ms_update_at, 'T', ' '), 'Z', '') AS ms_update_at"
  },
  selectMiscColumns: {

  }
},
  maintenance_api_access: {
  tablename: "maintenance_api_access",
  prefix: "maa",
  prefix_: "maa_",
  insertColumns: [
      "api_id",
      "access_id",
      "created_by",
      "created_at"
    ],
  selectColumns: [
      "maa_id",
      "maa_api_id",
      "maa_access_id",
      "maa_created_by",
      "maa_created_at"
    ],
  selectOptionColumns: {
    id: "maa_id",
    api_id: "maa_api_id",
    access_id: "maa_access_id",
    created_by: "maa_created_by",
    created_at: "maa_created_at"
  },
  updateOptionColumns: {
    id: "id",
    api_id: "api_id",
    access_id: "access_id",
    created_by: "created_by",
    created_at: "created_at"
  },
  selectDateFormatColumns: {
    created_at: "REPLACE(REPLACE(maa_created_at, 'T', ' '), 'Z', '') AS maa_created_at"
  },
  selectMiscColumns: {

  }
},
};

exports.Maintenance = Maintenance;