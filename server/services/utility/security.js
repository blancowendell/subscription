const crypto = require("crypto");
const { EncrypterString } = require("../repository/cryptography"); // ADJUST PATH

// Passwords use the same EncrypterString as master_users.
const HashPassword = (plain) => EncrypterString(String(plain));
const PasswordMatches = (plain, stored) => !!stored && stored === EncrypterString(String(plain));

// One-time tokens (email verification, password reset, etc.).
// Send `raw` to the user; store only `hash`.
const NewToken = (bytes = 32) => {
  const raw = crypto.randomBytes(bytes).toString("hex");
  return { raw, hash: HashToken(raw) };
};

const HashToken = (raw) => crypto.createHash("sha256").update(String(raw || "")).digest("hex");

module.exports = {
  HashPassword,
  PasswordMatches,
  NewToken,
  HashToken,
};