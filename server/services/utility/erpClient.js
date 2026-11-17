const crypto = require("crypto");
const axios = require("axios");

// Signed calls from the subscription node to the ERP node.
// Header x-signature = HMAC-SHA256(_ERP_SHARED_SECRET, `${timestamp}.${body}`)
// The ERP rejects requests whose timestamp is older than 5 minutes.

const REQUEST_TIMEOUT_MS = 120000; // provisioning runs migrations, give it time

const baseUrl = () => String(process.env._ERP_BASE_URL || "").replace(/\/$/, "");

const Sign = (timestamp, body) =>
  crypto
    .createHmac("sha256", String(process.env._ERP_SHARED_SECRET || ""))
    .update(`${timestamp}.${body}`)
    .digest("hex");

// PROVISION → POST  /api/provision
// others    → PATCH /api/tenants/:tenantCode
const endpointFor = (action, tenantCode) =>
  action === "PROVISION"
    ? { method: "post", url: `${baseUrl()}/api/provision` }
    : { method: "patch", url: `${baseUrl()}/api/tenants/${encodeURIComponent(tenantCode)}` };

// Resolves with the ERP response body; rejects with an Error carrying a readable message.
const SendToErp = async (action, tenantCode, payload) => {
  if (!baseUrl() || !process.env._ERP_SHARED_SECRET) {
    throw new Error("_ERP_BASE_URL or _ERP_SHARED_SECRET is not set.");
  }

  const { method, url } = endpointFor(action, tenantCode);
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  try {
    const response = await axios({
      method,
      url,
      data: body, // send the exact signed string
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        "Content-Type": "application/json",
        "x-timestamp": timestamp,
        "x-signature": Sign(timestamp, body),
      },
    });
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const detail =
      error.response?.data?.msg ||
      error.response?.data?.message ||
      (error.response?.data ? JSON.stringify(error.response.data) : null) ||
      error.message;
    throw new Error(status ? `ERP ${status}: ${detail}` : `ERP unreachable: ${detail}`);
  }
};

module.exports = {
  Sign,
  SendToErp,
};