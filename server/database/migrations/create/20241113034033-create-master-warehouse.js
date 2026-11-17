'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('master_warehouse', {
      mw_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      mw_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      mw_location: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      mw_company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_company',
          key: 'mc_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      mw_create_by: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      mw_created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      mw_status: {
        type: Sequelize.ENUM('ACTIVE','INACTIVE'),
        allowNull: false
      }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('master_warehouse');
  }
};
