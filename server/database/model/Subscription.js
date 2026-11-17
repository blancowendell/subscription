const Subscription = {
  subscription: {
  tablename: "subscription",
  prefix: "s",
  prefix_: "s_",
  insertColumns: [
      "ref",
      "account_id",
      "plan_id",
      "billing_cycle",
      "price",
      "is_trial",
      "start_date",
      "end_date",
      "grace_end_date",
      "cancelled_at",
      "cancel_reason",
      "status",
      "create_date",
      "create_by",
      "update_date",
      "update_by"
    ],
  selectColumns: [
      "s_id",
      "s_ref",
      "s_account_id",
      "s_plan_id",
      "s_billing_cycle",
      "s_price",
      "s_is_trial",
      "s_start_date",
      "s_end_date",
      "s_grace_end_date",
      "s_cancelled_at",
      "s_cancel_reason",
      "s_status",
      "s_create_date",
      "s_create_by",
      "s_update_date",
      "s_update_by"
    ],
  selectOptionColumns: {
    id: "s_id",
    ref: "s_ref",
    account_id: "s_account_id",
    plan_id: "s_plan_id",
    billing_cycle: "s_billing_cycle",
    price: "s_price",
    is_trial: "s_is_trial",
    start_date: "s_start_date",
    end_date: "s_end_date",
    grace_end_date: "s_grace_end_date",
    cancelled_at: "s_cancelled_at",
    cancel_reason: "s_cancel_reason",
    status: "s_status",
    create_date: "s_create_date",
    create_by: "s_create_by",
    update_date: "s_update_date",
    update_by: "s_update_by"
  },
  updateOptionColumns: {
    id: "id",
    ref: "ref",
    account_id: "account_id",
    plan_id: "plan_id",
    billing_cycle: "billing_cycle",
    price: "price",
    is_trial: "is_trial",
    start_date: "start_date",
    end_date: "end_date",
    grace_end_date: "grace_end_date",
    cancelled_at: "cancelled_at",
    cancel_reason: "cancel_reason",
    status: "status",
    create_date: "create_date",
    create_by: "create_by",
    update_date: "update_date",
    update_by: "update_by"
  },
  selectDateFormatColumns: {
    start_date: "REPLACE(REPLACE(s_start_date, 'T', ' '), 'Z', '') AS s_start_date",
    end_date: "REPLACE(REPLACE(s_end_date, 'T', ' '), 'Z', '') AS s_end_date",
    grace_end_date: "REPLACE(REPLACE(s_grace_end_date, 'T', ' '), 'Z', '') AS s_grace_end_date",
    cancelled_at: "REPLACE(REPLACE(s_cancelled_at, 'T', ' '), 'Z', '') AS s_cancelled_at",
    create_date: "REPLACE(REPLACE(s_create_date, 'T', ' '), 'Z', '') AS s_create_date",
    update_date: "REPLACE(REPLACE(s_update_date, 'T', ' '), 'Z', '') AS s_update_date"
  },
  selectMiscColumns: {

  }
},
  subscription_history: {
  tablename: "subscription_history",
  prefix: "sh",
  prefix_: "sh_",
  insertColumns: [
      "subscription_id",
      "action",
      "from_plan_id",
      "to_plan_id",
      "from_status",
      "to_status",
      "from_end_date",
      "to_end_date",
      "remarks",
      "create_date",
      "create_by"
    ],
  selectColumns: [
      "sh_id",
      "sh_subscription_id",
      "sh_action",
      "sh_from_plan_id",
      "sh_to_plan_id",
      "sh_from_status",
      "sh_to_status",
      "sh_from_end_date",
      "sh_to_end_date",
      "sh_remarks",
      "sh_create_date",
      "sh_create_by"
    ],
  selectOptionColumns: {
    id: "sh_id",
    subscription_id: "sh_subscription_id",
    action: "sh_action",
    from_plan_id: "sh_from_plan_id",
    to_plan_id: "sh_to_plan_id",
    from_status: "sh_from_status",
    to_status: "sh_to_status",
    from_end_date: "sh_from_end_date",
    to_end_date: "sh_to_end_date",
    remarks: "sh_remarks",
    create_date: "sh_create_date",
    create_by: "sh_create_by"
  },
  updateOptionColumns: {
    id: "id",
    subscription_id: "subscription_id",
    action: "action",
    from_plan_id: "from_plan_id",
    to_plan_id: "to_plan_id",
    from_status: "from_status",
    to_status: "to_status",
    from_end_date: "from_end_date",
    to_end_date: "to_end_date",
    remarks: "remarks",
    create_date: "create_date",
    create_by: "create_by"
  },
  selectDateFormatColumns: {
    from_end_date: "REPLACE(REPLACE(sh_from_end_date, 'T', ' '), 'Z', '') AS sh_from_end_date",
    to_end_date: "REPLACE(REPLACE(sh_to_end_date, 'T', ' '), 'Z', '') AS sh_to_end_date",
    create_date: "REPLACE(REPLACE(sh_create_date, 'T', ' '), 'Z', '') AS sh_create_date"
  },
  selectMiscColumns: {

  }
},
};

exports.Subscription = Subscription;