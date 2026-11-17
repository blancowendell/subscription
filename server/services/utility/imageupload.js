const {
  GetCurrentDatetime,
  InsertStatement,
  SelectStatement,
} = require("../../services/repository/customhelper");
const { InsertTable, Check, Update } = require("../../services/repository/dbconnect");
const { UpdateStatement } = require("../../services/repository/helper");

exports.ImageUpload = (type, tableId, imageData, callback) => {
  try {
    const create_date = GetCurrentDatetime();

    const checkStatement = SelectStatement(
      "SELECT * FROM master_file_image WHERE mfi_type = ? AND mfi_table_id = ?",
      [type, tableId]
    );

    Check(checkStatement)
      .then((existing) => {
        console.log("Check existing image result:", existing);

        if (Array.isArray(existing) && existing.length > 0) {
          const updateStatement = UpdateStatement(
            "master_file_image",
            "mfi",
            ["image", "create_date"],
            ["type", "table_id"]
          );
          const updateData = [imageData, create_date, type, tableId];

          Update(updateStatement, updateData, (err, result) => {
            if (err) {
              console.error("Image update error:", err);
              return callback(err);
            } else {
              console.log("Image updated, affected rows:", result.affectedRows);
              return callback(null, { success: true, message: "Image updated successfully" });
            }
          });
        } else {
          const insertStatement = InsertStatement("master_file_image", "mfi", [
            "type",
            "table_id",
            "image",
            "create_date",
          ]);
          const insertData = [[type, tableId, imageData, create_date]];

          InsertTable(insertStatement, insertData, (err, result) => {
            if (err) {
              console.error("Image insert error:", err);
              return callback(err);
            } else {
              console.log("Image inserted successfully:", result);
              return callback(null, { success: true, message: "Image inserted successfully" });
            }
          });
        }
      })

      .catch((error) => {
        console.error("Error in ImageUpload Check:", error);
        return callback(error);
      });
  } catch (error) {
    console.error("Error in ImageUpload:", error);
    return callback(error);
  }
};






