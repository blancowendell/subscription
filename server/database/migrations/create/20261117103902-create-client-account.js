'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('client_account', {
      ca_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      ca_tenant_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      ca_company_name: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      ca_tin: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      ca_address: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      ca_business_type: {
        type: Sequelize.ENUM('RETAIL', 'TRADING', 'RESTAURANT', 'MANUFACTURING', 'SERVICES', 'OTHER'),
        allowNull: false
      },
      ca_contact_person: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      ca_contact_email: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      ca_contact_phone: {
        type: Sequelize.STRING(30),
        allowNull: true
      },
      ca_status: {
        type: Sequelize.ENUM('PENDING', 'ACTIVE', 'BLOCKED'),
        allowNull: false
      },
      ca_create_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      ca_create_by: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      ca_update_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      ca_update_by: {
        type: Sequelize.STRING(50),
        allowNull: true
      }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('client_account');
  }
};