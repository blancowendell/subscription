const Client = {
  client_account: {
  tablename: "client_account",
  prefix: "ca",
  prefix_: "ca_",
  insertColumns: [
      "tenant_code",
      "company_name",
      "tin",
      "address",
      "business_type",
      "contact_person",
      "contact_email",
      "contact_phone",
      "status",
      "create_date",
      "create_by",
      "update_date",
      "update_by"
    ],
  selectColumns: [
      "ca_id",
      "ca_tenant_code",
      "ca_company_name",
      "ca_tin",
      "ca_address",
      "ca_business_type",
      "ca_contact_person",
      "ca_contact_email",
      "ca_contact_phone",
      "ca_status",
      "ca_create_date",
      "ca_create_by",
      "ca_update_date",
      "ca_update_by"
    ],
  selectOptionColumns: {
    id: "ca_id",
    tenant_code: "ca_tenant_code",
    company_name: "ca_company_name",
    tin: "ca_tin",
    address: "ca_address",
    business_type: "ca_business_type",
    contact_person: "ca_contact_person",
    contact_email: "ca_contact_email",
    contact_phone: "ca_contact_phone",
    status: "ca_status",
    create_date: "ca_create_date",
    create_by: "ca_create_by",
    update_date: "ca_update_date",
    update_by: "ca_update_by"
  },
  updateOptionColumns: {
    id: "id",
    tenant_code: "tenant_code",
    company_name: "company_name",
    tin: "tin",
    address: "address",
    business_type: "business_type",
    contact_person: "contact_person",
    contact_email: "contact_email",
    contact_phone: "contact_phone",
    status: "status",
    create_date: "create_date",
    create_by: "create_by",
    update_date: "update_date",
    update_by: "update_by"
  },
  selectDateFormatColumns: {
    create_date: "REPLACE(REPLACE(ca_create_date, 'T', ' '), 'Z', '') AS ca_create_date",
    update_date: "REPLACE(REPLACE(ca_update_date, 'T', ' '), 'Z', '') AS ca_update_date"
  },
  selectMiscColumns: {

  }
},
  client_users: {
  tablename: "client_users",
  prefix: "cu",
  prefix_: "cu_",
  insertColumns: [
      "account_id",
      "fullname",
      "email",
      "password",
      "role",
      "is_verified",
      "verified_at",
      "is_update_password",
      "last_login_at",
      "status",
      "create_date",
      "create_by",
      "update_date",
      "update_by"
    ],
  selectColumns: [
      "cu_id",
      "cu_account_id",
      "cu_fullname",
      "cu_email",
      "cu_password",
      "cu_role",
      "cu_is_verified",
      "cu_verified_at",
      "cu_is_update_password",
      "cu_last_login_at",
      "cu_status",
      "cu_create_date",
      "cu_create_by",
      "cu_update_date",
      "cu_update_by"
    ],
  selectOptionColumns: {
    id: "cu_id",
    account_id: "cu_account_id",
    fullname: "cu_fullname",
    email: "cu_email",
    password: "cu_password",
    role: "cu_role",
    is_verified: "cu_is_verified",
    verified_at: "cu_verified_at",
    is_update_password: "cu_is_update_password",
    last_login_at: "cu_last_login_at",
    status: "cu_status",
    create_date: "cu_create_date",
    create_by: "cu_create_by",
    update_date: "cu_update_date",
    update_by: "cu_update_by"
  },
  updateOptionColumns: {
    id: "id",
    account_id: "account_id",
    fullname: "fullname",
    email: "email",
    password: "password",
    role: "role",
    is_verified: "is_verified",
    verified_at: "verified_at",
    is_update_password: "is_update_password",
    last_login_at: "last_login_at",
    status: "status",
    create_date: "create_date",
    create_by: "create_by",
    update_date: "update_date",
    update_by: "update_by"
  },
  selectDateFormatColumns: {
    verified_at: "REPLACE(REPLACE(cu_verified_at, 'T', ' '), 'Z', '') AS cu_verified_at",
    last_login_at: "REPLACE(REPLACE(cu_last_login_at, 'T', ' '), 'Z', '') AS cu_last_login_at",
    create_date: "REPLACE(REPLACE(cu_create_date, 'T', ' '), 'Z', '') AS cu_create_date",
    update_date: "REPLACE(REPLACE(cu_update_date, 'T', ' '), 'Z', '') AS cu_update_date"
  },
  selectMiscColumns: {

  }
},
  client_tokens: {
  tablename: "client_tokens",
  prefix: "ct",
  prefix_: "ct_",
  insertColumns: [
      "user_id",
      "type",
      "token_hash",
      "expires_at",
      "used_at",
      "create_date"
    ],
  selectColumns: [
      "ct_id",
      "ct_user_id",
      "ct_type",
      "ct_token_hash",
      "ct_expires_at",
      "ct_used_at",
      "ct_create_date"
    ],
  selectOptionColumns: {
    id: "ct_id",
    user_id: "ct_user_id",
    type: "ct_type",
    token_hash: "ct_token_hash",
    expires_at: "ct_expires_at",
    used_at: "ct_used_at",
    create_date: "ct_create_date"
  },
  updateOptionColumns: {
    id: "id",
    user_id: "user_id",
    type: "type",
    token_hash: "token_hash",
    expires_at: "expires_at",
    used_at: "used_at",
    create_date: "create_date"
  },
  selectDateFormatColumns: {
    expires_at: "REPLACE(REPLACE(ct_expires_at, 'T', ' '), 'Z', '') AS ct_expires_at",
    used_at: "REPLACE(REPLACE(ct_used_at, 'T', ' '), 'Z', '') AS ct_used_at",
    create_date: "REPLACE(REPLACE(ct_create_date, 'T', ' '), 'Z', '') AS ct_create_date"
  },
  selectMiscColumns: {

  }
},
};

exports.Client = Client;