"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("system_settings", {
      ss_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      ss_key: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      ss_value: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      ss_type: {
        type: Sequelize.ENUM("BOOLEAN", "STRING", "NUMBER"),
        allowNull: false,
      },
      ss_description: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      ss_company_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "master_company",
          key: "mc_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      ss_warehouse_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "master_warehouse",
          key: "mw_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      ss_created_by: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      ss_updated_by: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      ss_created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      ss_updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("system_settings");
  },
};