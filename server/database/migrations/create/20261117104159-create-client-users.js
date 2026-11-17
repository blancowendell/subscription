'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('client_users', {
      cu_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      cu_account_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'client_account',
          key: 'ca_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      cu_fullname: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      cu_email: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true
      },
      cu_password: {
        type: Sequelize.TEXT('long'),
        allowNull: false
      },
      cu_role: {
        type: Sequelize.ENUM('OWNER', 'BILLING'),
        allowNull: false
      },
      cu_is_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      cu_verified_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cu_is_update_password: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      cu_last_login_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cu_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false
      },
      cu_create_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      cu_create_by: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      cu_update_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cu_update_by: {
        type: Sequelize.STRING(50),
        allowNull: true
      }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('client_users');
  }
};