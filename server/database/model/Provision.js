const Provision = {
  provision_job: {
  tablename: "provision_job",
  prefix: "pj",
  prefix_: "pj_",
  insertColumns: [
      "subscription_id",
      "tenant_code",
      "action",
      "payload",
      "response",
      "attempts",
      "last_error",
      "next_retry_at",
      "lock_token",
      "completed_at",
      "status",
      "create_date",
      "create_by",
      "update_date",
      "update_by"
    ],
  selectColumns: [
      "pj_id",
      "pj_subscription_id",
      "pj_tenant_code",
      "pj_action",
      "pj_payload",
      "pj_response",
      "pj_attempts",
      "pj_last_error",
      "pj_next_retry_at",
      "pj_lock_token",
      "pj_completed_at",
      "pj_status",
      "pj_create_date",
      "pj_create_by",
      "pj_update_date",
      "pj_update_by"
    ],
  selectOptionColumns: {
    id: "pj_id",
    subscription_id: "pj_subscription_id",
    tenant_code: "pj_tenant_code",
    action: "pj_action",
    payload: "pj_payload",
    response: "pj_response",
    attempts: "pj_attempts",
    last_error: "pj_last_error",
    next_retry_at: "pj_next_retry_at",
    lock_token: "pj_lock_token",
    completed_at: "pj_completed_at",
    status: "pj_status",
    create_date: "pj_create_date",
    create_by: "pj_create_by",
    update_date: "pj_update_date",
    update_by: "pj_update_by"
  },
  updateOptionColumns: {
    id: "id",
    subscription_id: "subscription_id",
    tenant_code: "tenant_code",
    action: "action",
    payload: "payload",
    response: "response",
    attempts: "attempts",
    last_error: "last_error",
    next_retry_at: "next_retry_at",
    lock_token: "lock_token",
    completed_at: "completed_at",
    status: "status",
    create_date: "create_date",
    create_by: "create_by",
    update_date: "update_date",
    update_by: "update_by"
  },
  selectDateFormatColumns: {
    next_retry_at: "REPLACE(REPLACE(pj_next_retry_at, 'T', ' '), 'Z', '') AS pj_next_retry_at",
    completed_at: "REPLACE(REPLACE(pj_completed_at, 'T', ' '), 'Z', '') AS pj_completed_at",
    create_date: "REPLACE(REPLACE(pj_create_date, 'T', ' '), 'Z', '') AS pj_create_date",
    update_date: "REPLACE(REPLACE(pj_update_date, 'T', ' '), 'Z', '') AS pj_update_date"
  },
  selectMiscColumns: {

  }
},
};

exports.Provision = Provision;