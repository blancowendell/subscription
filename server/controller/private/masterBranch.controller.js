const { JsonErrorResponse } = require("../../services/repository/response");
const { validateOrLink } = require("../../services/utility/validator");

// GET
const loadMasterBranch = async (req, res) => {
  try {
    // Logic for loading multiple records
  } catch (error) {
    console.error(error);
    res.json(JsonErrorResponse(error));
  }
};

// GET BY ID
const getMasterBranch = async (req, res) => {
  try {
    const required = {
      // id: "ID Number is required",
    };

    if (!validateOrLink(req, res, required)) return;

    const { id } = req.params;

    // Logic for getting a single record
  } catch (error) {
    console.error(error);
    res.json(JsonErrorResponse(error));
  }
};

// POST
const addMasterBranch = async (req, res) => {
  try {
    const required = {
      // name: "Name is required",
    };

    if (!validateOrLink(req, res, required)) return;

    // Proceed with creation...
  } catch (error) {
    console.error(error);
    res.json(JsonErrorResponse(error));
  }
};

// PUT
const editMasterBranch = async (req, res) => {
  try {
    const required = {
      // id: "ID Number is required",
    };

    if (!validateOrLink(req, res, required)) return;

    const { id } = req.params;

    // Proceed with update...
  } catch (error) {
    console.error(error);
    res.json(JsonErrorResponse(error));
  }
};

module.exports = {
  loadMasterBranch,
  getMasterBranch,
  addMasterBranch,
  editMasterBranch,
};
