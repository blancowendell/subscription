'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('master_plan', {
      mp_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      mp_code: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true
      },
      mp_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      mp_description: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      mp_price_monthly: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      mp_price_yearly: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      mp_trial_days: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      mp_grace_days: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      mp_sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      mp_is_public: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      mp_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false
      },
      mp_create_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      mp_create_by: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      mp_update_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      mp_update_by: {
        type: Sequelize.STRING(50),
        allowNull: true
      }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('master_plan');
  }
};