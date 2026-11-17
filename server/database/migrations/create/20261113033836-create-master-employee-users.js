"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("master_employee_users", {
      meu_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      meu_fullname: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      meu_access_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "master_access",
          key: "ma_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      meu_employee_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: "master_employee",
          key: "me_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      meu_company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "master_company",
          key: "mc_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      meu_warehouse_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "master_warehouse",
          key: "mw_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      meu_username: {
        type: Sequelize.TEXT,
      },
      meu_password: {
        type: Sequelize.TEXT("long"),
        allowNull: false,
      },
      meu_is_update_password: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      meu_created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      meu_created_by: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      meu_status: {
        type: Sequelize.ENUM("ACTIVE", "INACTIVE"),
        allowNull: false,
      },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("master_employee_users");
  },
};