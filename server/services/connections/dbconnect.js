const mysql = require("mysql2/promise");
require("dotenv").config();
const { Decrypter } = require("../repository/cryptography");
const { logger, logEvents } = require("../../middleware/logger");

const db = {
  pool: null 
};

exports.InitializeConnection = () => {
  return new Promise((resolve, reject) => {
    Decrypter(process.env._PASSWORD_ADMIN, async (err, encrypted) => {
      if (err) {
        console.error("Error decrypting password: ", err);
        return reject(err);
      }

      try {
        db.pool = mysql.createPool({
          host: process.env._HOST_ADMIN,
          user: process.env._USER_ADMIN,
          password: encrypted,
          database: process.env._DATABASE_ADMIN,
          timezone: "local",
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          multipleStatements: true,
        });

        // 2. Test the pool to ensure it connected
        const connection = await db.pool.getConnection();
        console.log("MySQL Database Pool established successfully!");
        connection.release();
        resolve();
        
      } catch (poolError) {
        console.error("Error connecting to MYSQL pool: ", poolError);
        logEvents(poolError, "sqlError.log");
        reject(poolError);
      }
    });
  });
};

exports.db = db;