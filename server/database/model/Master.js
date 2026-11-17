const Master = {
  master_company: {
  tablename: "master_company",
  prefix: "mc",
  prefix_: "mc_",
  insertColumns: [
      "code",
      "name",
      "address",
      "created_at",
      "created_by",
      "status"
    ],
  selectColumns: [
      "mc_id",
      "mc_code",
      "mc_name",
      "mc_address",
      "mc_created_at",
      "mc_created_by",
      "mc_status"
    ],
  selectOptionColumns: {
    id: "mc_id",
    code: "mc_code",
    name: "mc_name",
    address: "mc_address",
    created_at: "mc_created_at",
    created_by: "mc_created_by",
    status: "mc_status"
  },
  updateOptionColumns: {
    id: "id",
    code: "code",
    name: "name",
    address: "address",
    created_at: "created_at",
    created_by: "created_by",
    status: "status"
  },
  selectDateFormatColumns: {
    created_at: "REPLACE(REPLACE(mc_created_at, 'T', ' '), 'Z', '') AS mc_created_at"
  },
  selectMiscColumns: {

  }
},
  master_warehouse: {
  tablename: "master_warehouse",
  prefix: "mw",
  prefix_: "mw_",
  insertColumns: [
      "name",
      "location",
      "company_id",
      "create_by",
      "created_at",
      "status"
    ],
  selectColumns: [
      "mw_id",
      "mw_name",
      "mw_location",
      "mw_company_id",
      "mw_create_by",
      "mw_created_at",
      "mw_status"
    ],
  selectOptionColumns: {
    id: "mw_id",
    name: "mw_name",
    location: "mw_location",
    company_id: "mw_company_id",
    create_by: "mw_create_by",
    created_at: "mw_created_at",
    status: "mw_status"
  },
  updateOptionColumns: {
    id: "id",
    name: "name",
    location: "location",
    company_id: "company_id",
    create_by: "create_by",
    created_at: "created_at",
    status: "status"
  },
  selectDateFormatColumns: {
    created_at: "REPLACE(REPLACE(mw_created_at, 'T', ' '), 'Z', '') AS mw_created_at"
  },
  selectMiscColumns: {

  }
},
  master_branch: {
  tablename: "master_branch",
  prefix: "mb",
  prefix_: "mb_",
  insertColumns: [
      "name",
      "location",
      "company_id",
      "warehouse_id",
      "create_by",
      "created_at",
      "status"
    ],
  selectColumns: [
      "mb_id",
      "mb_name",
      "mb_location",
      "mb_company_id",
      "mb_warehouse_id",
      "mb_create_by",
      "mb_created_at",
      "mb_status"
    ],
  selectOptionColumns: {
    id: "mb_id",
    name: "mb_name",
    location: "mb_location",
    company_id: "mb_company_id",
    warehouse_id: "mb_warehouse_id",
    create_by: "mb_create_by",
    created_at: "mb_created_at",
    status: "mb_status"
  },
  updateOptionColumns: {
    id: "id",
    name: "name",
    location: "location",
    company_id: "company_id",
    warehouse_id: "warehouse_id",
    create_by: "create_by",
    created_at: "created_at",
    status: "status"
  },
  selectDateFormatColumns: {
    created_at: "REPLACE(REPLACE(mb_created_at, 'T', ' '), 'Z', '') AS mb_created_at"
  },
  selectMiscColumns: {

  }
},
  master_access: {
  tablename: "master_access",
  prefix: "ma",
  prefix_: "ma_",
  insertColumns: [
      "name",
      "company_id",
      "warehouse_id",
      "create_by",
      "update_date",
      "update_by"
    ],
  selectColumns: [
      "ma_id",
      "ma_name",
      "ma_company_id",
      "ma_warehouse_id",
      "ma_is_system",
      "ma_status",
      "ma_create_date",
      "ma_create_by",
      "ma_update_date",
      "ma_update_by"
    ],
  selectOptionColumns: {
    id: "ma_id",
    name: "ma_name",
    company_id: "ma_company_id",
    warehouse_id: "ma_warehouse_id",
    is_system: "ma_is_system",
    status: "ma_status",
    create_date: "ma_create_date",
    create_by: "ma_create_by",
    update_date: "ma_update_date",
    update_by: "ma_update_by"
  },
  updateOptionColumns: {
    id: "id",
    name: "name",
    company_id: "company_id",
    warehouse_id: "warehouse_id",
    is_system: "is_system",
    status: "status",
    create_date: "create_date",
    create_by: "create_by",
    update_date: "update_date",
    update_by: "update_by"
  },
  selectDateFormatColumns: {
    create_date: "REPLACE(REPLACE(ma_create_date, 'T', ' '), 'Z', '') AS ma_create_date",
    update_date: "REPLACE(REPLACE(ma_update_date, 'T', ' '), 'Z', '') AS ma_update_date"
  },
  selectMiscColumns: {

  }
},
  master_employee: {
  tablename: "master_employee",
  prefix: "me",
  prefix_: "me_",
  insertColumns: [
      "id",
      "company_id",
      "first_name",
      "last_name",
      "email"
    ],
  selectColumns: [
      "me_id",
      "me_company_id",
      "me_first_name",
      "me_last_name",
      "me_email"
    ],
  selectOptionColumns: {
    id: "me_id",
    company_id: "me_company_id",
    first_name: "me_first_name",
    last_name: "me_last_name",
    email: "me_email"
  },
  updateOptionColumns: {
    id: "id",
    company_id: "company_id",
    first_name: "first_name",
    last_name: "last_name",
    email: "email"
  },
  selectDateFormatColumns: {

  },
  selectMiscColumns: {
    fullname: "CONCAT(me_first_name,' ',me_last_name) AS fullname"
  }
},
  master_users: {
  tablename: "master_users",
  prefix: "mu",
  prefix_: "mu_",
  insertColumns: [
      "access_id",
      "username",
      "password",
      "create_by"
    ],
  selectColumns: [
      "mu_id",
      "mu_access_id",
      "mu_username",
      "mu_password",
      "mu_status",
      "mu_is_update_password",
      "mu_create_date",
      "mu_create_by"
    ],
  selectOptionColumns: {
    id: "mu_id",
    access_id: "mu_access_id",
    username: "mu_username",
    password: "mu_password",
    status: "mu_status",
    is_update_password: "mu_is_update_password",
    create_date: "mu_create_date",
    create_by: "mu_create_by"
  },
  updateOptionColumns: {
    id: "id",
    access_id: "access_id",
    username: "username",
    password: "password",
    status: "status",
    is_update_password: "is_update_password",
    create_date: "create_date",
    create_by: "create_by"
  },
  selectDateFormatColumns: {
    create_date: "REPLACE(REPLACE(mu_create_date, 'T', ' '), 'Z', '') AS mu_create_date"
  },
  selectMiscColumns: {

  }
},
  master_access_types: {
  tablename: "master_access_types",
  prefix: "mat",
  prefix_: "mat_",
  insertColumns: [
      "name",
      "access_id",
      "company_id",
      "permission_name",
      "create_by"
    ],
  selectColumns: [
      "mat_id",
      "mat_name",
      "mat_access_id",
      "mat_company_id",
      "mat_permission_name",
      "mat_status",
      "mat_create_date",
      "mat_create_by"
    ],
  selectOptionColumns: {
    id: "mat_id",
    name: "mat_name",
    access_id: "mat_access_id",
    company_id: "mat_company_id",
    permission_name: "mat_permission_name",
    status: "mat_status",
    create_date: "mat_create_date",
    create_by: "mat_create_by"
  },
  updateOptionColumns: {
    id: "id",
    name: "name",
    access_id: "access_id",
    company_id: "company_id",
    permission_name: "permission_name",
    status: "status",
    create_date: "create_date",
    create_by: "create_by"
  },
  selectDateFormatColumns: {
    create_date: "REPLACE(REPLACE(mat_create_date, 'T', ' '), 'Z', '') AS mat_create_date"
  },
  selectMiscColumns: {

  }
},
  master_employee_users: {
  tablename: "master_employee_users",
  prefix: "meu",
  prefix_: "meu_",
  insertColumns: [
      "fullname",
      "access_id",
      "employee_id",
      "company_id",
      "warehouse_id",
      "username",
      "password",
      "created_at",
      "created_by",
      "status"
    ],
  selectColumns: [
      "meu_id",
      "meu_fullname",
      "meu_access_id",
      "meu_employee_id",
      "meu_company_id",
      "meu_warehouse_id",
      "meu_username",
      "meu_password",
      "meu_is_update_password",
      "meu_created_at",
      "meu_created_by",
      "meu_status"
    ],
  selectOptionColumns: {
    id: "meu_id",
    fullname: "meu_fullname",
    access_id: "meu_access_id",
    employee_id: "meu_employee_id",
    company_id: "meu_company_id",
    warehouse_id: "meu_warehouse_id",
    username: "meu_username",
    password: "meu_password",
    is_update_password: "meu_is_update_password",
    created_at: "meu_created_at",
    created_by: "meu_created_by",
    status: "meu_status"
  },
  updateOptionColumns: {
    id: "id",
    fullname: "fullname",
    access_id: "access_id",
    employee_id: "employee_id",
    company_id: "company_id",
    warehouse_id: "warehouse_id",
    username: "username",
    password: "password",
    is_update_password: "is_update_password",
    created_at: "created_at",
    created_by: "created_by",
    status: "status"
  },
  selectDateFormatColumns: {
    created_at: "REPLACE(REPLACE(meu_created_at, 'T', ' '), 'Z', '') AS meu_created_at"
  },
  selectMiscColumns: {

  }
},
  master_pages: {
  tablename: "master_pages",
  prefix: "mp",
  prefix_: "mp_",
  insertColumns: [
      "code",
      "name",
      "parent_id",
      "route",
      "icon",
      "create_by",
      "update_date",
      "update_by"
    ],
  selectColumns: [
      "mp_id",
      "mp_code",
      "mp_name",
      "mp_parent_id",
      "mp_route",
      "mp_icon",
      "mp_sort_order",
      "mp_status",
      "mp_create_date",
      "mp_create_by",
      "mp_update_date",
      "mp_update_by"
    ],
  selectOptionColumns: {
    id: "mp_id",
    code: "mp_code",
    name: "mp_name",
    parent_id: "mp_parent_id",
    route: "mp_route",
    icon: "mp_icon",
    sort_order: "mp_sort_order",
    status: "mp_status",
    create_date: "mp_create_date",
    create_by: "mp_create_by",
    update_date: "mp_update_date",
    update_by: "mp_update_by"
  },
  updateOptionColumns: {
    id: "id",
    code: "code",
    name: "name",
    parent_id: "parent_id",
    route: "route",
    icon: "icon",
    sort_order: "sort_order",
    status: "status",
    create_date: "create_date",
    create_by: "create_by",
    update_date: "update_date",
    update_by: "update_by"
  },
  selectDateFormatColumns: {
    create_date: "REPLACE(REPLACE(mp_create_date, 'T', ' '), 'Z', '') AS mp_create_date",
    update_date: "REPLACE(REPLACE(mp_update_date, 'T', ' '), 'Z', '') AS mp_update_date"
  },
  selectMiscColumns: {

  }
},
  master_actions: {
  tablename: "master_actions",
  prefix: "mac",
  prefix_: "mac_",
  insertColumns: [
      "code",
      "name",
      "create_by"
    ],
  selectColumns: [
      "mac_id",
      "mac_code",
      "mac_name",
      "mac_sort_order",
      "mac_status",
      "mac_create_date",
      "mac_create_by"
    ],
  selectOptionColumns: {
    id: "mac_id",
    code: "mac_code",
    name: "mac_name",
    sort_order: "mac_sort_order",
    status: "mac_status",
    create_date: "mac_create_date",
    create_by: "mac_create_by"
  },
  updateOptionColumns: {
    id: "id",
    code: "code",
    name: "name",
    sort_order: "sort_order",
    status: "status",
    create_date: "create_date",
    create_by: "create_by"
  },
  selectDateFormatColumns: {
    create_date: "REPLACE(REPLACE(mac_create_date, 'T', ' '), 'Z', '') AS mac_create_date"
  },
  selectMiscColumns: {

  }
},
  master_page_actions: {
  tablename: "master_page_actions",
  prefix: "mpa",
  prefix_: "mpa_",
  insertColumns: [
      "page_id",
      "action_id",
      "create_by"
    ],
  selectColumns: [
      "mpa_id",
      "mpa_page_id",
      "mpa_action_id",
      "mpa_status",
      "mpa_create_date",
      "mpa_create_by"
    ],
  selectOptionColumns: {
    id: "mpa_id",
    page_id: "mpa_page_id",
    action_id: "mpa_action_id",
    status: "mpa_status",
    create_date: "mpa_create_date",
    create_by: "mpa_create_by"
  },
  updateOptionColumns: {
    id: "id",
    page_id: "page_id",
    action_id: "action_id",
    status: "status",
    create_date: "create_date",
    create_by: "create_by"
  },
  selectDateFormatColumns: {
    create_date: "REPLACE(REPLACE(mpa_create_date, 'T', ' '), 'Z', '') AS mpa_create_date"
  },
  selectMiscColumns: {

  }
},
  master_access_rights: {
  tablename: "master_access_rights",
  prefix: "mar",
  prefix_: "mar_",
  insertColumns: [
      "access_id",
      "page_action_id",
      "create_by",
      "update_date",
      "update_by"
    ],
  selectColumns: [
      "mar_id",
      "mar_access_id",
      "mar_page_action_id",
      "mar_is_allowed",
      "mar_create_date",
      "mar_create_by",
      "mar_update_date",
      "mar_update_by"
    ],
  selectOptionColumns: {
    id: "mar_id",
    access_id: "mar_access_id",
    page_action_id: "mar_page_action_id",
    is_allowed: "mar_is_allowed",
    create_date: "mar_create_date",
    create_by: "mar_create_by",
    update_date: "mar_update_date",
    update_by: "mar_update_by"
  },
  updateOptionColumns: {
    id: "id",
    access_id: "access_id",
    page_action_id: "page_action_id",
    is_allowed: "is_allowed",
    create_date: "create_date",
    create_by: "create_by",
    update_date: "update_date",
    update_by: "update_by"
  },
  selectDateFormatColumns: {
    create_date: "REPLACE(REPLACE(mar_create_date, 'T', ' '), 'Z', '') AS mar_create_date",
    update_date: "REPLACE(REPLACE(mar_update_date, 'T', ' '), 'Z', '') AS mar_update_date"
  },
  selectMiscColumns: {

  }
},
};

exports.Master = Master;