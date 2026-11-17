const validateOrLink = (req, res, schema) => {
  const data = { ...req.params, ...req.query, ...req.body };

  const missingKeys = Object.keys(schema).filter(
    (key) => data[key] === undefined || data[key] === null || data[key] === ""
  );

  if (missingKeys.length > 0) {
    const labels = missingKeys.map((key) => schema[key]);

    if (!res.headersSent) {
      res.status(400).json({
        message: `Missing: ${labels.join(", ")}`,
        fields: missingKeys,
      });
    }
    return false;
  }

  return true;
};

module.exports = {
  validateOrLink,
};