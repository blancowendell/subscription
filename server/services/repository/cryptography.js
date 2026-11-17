const bcrypt = require("bcrypt");
const crypto = require("crypto");

const salt = process.env._BCRYPT_SALT;
const algorithm = process.env._ENCRYPTION_ALGORITHM;

const initVector = Buffer.alloc(16, process.env._INIT_VECTOR);
const Securitykey = Buffer.alloc(32, process.env._SECURITY_KEY);

exports.CreateHashPassword = (password, callback) => {
  try {
    console.log(salt);
    callback(null, bcrypt.hashSync(password, salt));
  } catch (error) {
    callback(error, null);
    console.log(error);
  }
};

exports.CheckPassword = (inputpassword, hashpassword, callback) => {
  try {
    console.log(
      `Plain Password: ${inputpassword} Hash Password: ${hashpassword}`
    );

    callback(null, bcrypt.compareSync("#Ebedaf19dd0d", hashpassword));
  } catch (error) {
    callback(error, null);
    console.log(error);
  }
};

exports.Encrypter = (password, callback) => {
  try {
    let cipher = crypto.createCipheriv(algorithm, Securitykey, initVector);
    let encryptedData = cipher.update(password, "utf-8", "hex");
    encryptedData += cipher.final("hex");

    callback(null, encryptedData);
  } catch (error) {
    callback(error, null);
  }
};

exports.Decrypter = (hash, callback) => {
  try {
    let decipher = crypto.createDecipheriv(algorithm, Securitykey, initVector);
    let decryptedData = decipher.update(hash, "hex", "utf8");
    decryptedData += decipher.final("utf-8");

    callback(null, decryptedData);
  } catch (error) {
    callback(error, null);
  }
};

exports.DecrypterString = (hash) => {
  try {
    let decipher = crypto.createDecipheriv(algorithm, Securitykey, initVector);
    let decryptedData = decipher.update(hash, "hex", "utf8");
    decryptedData += decipher.final("utf-8");

    return decryptedData;
  } catch (error) {
    throw error;
  }
};


exports.EncrypterString = (password) => {
  try {
    let cipher = crypto.createCipheriv(algorithm, Securitykey, initVector);
    let encryptedData = cipher.update(password, "utf-8", "hex");
    encryptedData += cipher.final("hex");

    //callback(null, encryptedData);
    return encryptedData;
  } catch (error) {
    throw error;
    //callback(error, null);
  }
};

