"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("maintenance_dashboards", {
      md_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      md_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      md_user_source: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      md_user_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      md_title: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      md_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      md_owner: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      md_sort: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      md_created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("maintenance_dashboards", ["md_user_source", "md_user_id"], {
      name: "idx_md_owner",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("maintenance_dashboards");
  },
};