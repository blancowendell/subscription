'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('master_company', {
      mc_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      mc_code: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      mc_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      mc_address: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      mc_created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      mc_created_by: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      mc_status: {
        type: Sequelize.ENUM('ACTIVE','INACTIVE'),
        allowNull: false
      }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('master_company');
  }
};
