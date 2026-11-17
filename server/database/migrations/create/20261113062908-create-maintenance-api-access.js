"use strict";

// Which roles may use which dashboard data source.
// A row means "allowed"; no row means "not allowed" (system roles always are).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("maintenance_api_access", {
      maa_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      maa_api_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "maintenance_api", key: "ma_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      maa_access_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "master_access", key: "ma_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      maa_created_by: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      maa_created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("maintenance_api_access", ["maa_api_id", "maa_access_id"], {
      name: "uq_maa_api_access",
      unique: true,
    });

    await queryInterface.addIndex("maintenance_api_access", ["maa_access_id"], {
      name: "idx_maa_access",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("maintenance_api_access");
  },
};