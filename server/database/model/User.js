const User = {
  user_login: {
  tablename: "user_login",
  prefix: "ul",
  prefix_: "ul_",
  insertColumns: [
      "created_at",
      "status"
    ],
  selectColumns: [
      "ul_id",
      "ul_created_at",
      "ul_status"
    ],
  selectOptionColumns: {
    id: "ul_id",
    created_at: "ul_created_at",
    status: "ul_status"
  },
  updateOptionColumns: {
    id: "id",
    created_at: "created_at",
    status: "status"
  },
  selectDateFormatColumns: {
    created_at: "REPLACE(REPLACE(ul_created_at, 'T', ' '), 'Z', '') AS ul_created_at"
  },
  selectMiscColumns: {

  }
},
};

exports.User = User;