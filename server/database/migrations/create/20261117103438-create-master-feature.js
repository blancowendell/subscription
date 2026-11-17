'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('master_feature', {
      mf_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      mf_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      mf_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      mf_module: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      mf_type: {
        type: Sequelize.ENUM('MODULE', 'LIMIT'),
        allowNull: false
      },
      mf_description: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      mf_sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      mf_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false
      },
      mf_create_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      mf_create_by: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      mf_update_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      mf_update_by: {
        type: Sequelize.STRING(50),
        allowNull: true
      }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('master_feature');
  }
};