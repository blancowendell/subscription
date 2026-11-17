'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('master_branch', {
      mb_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      mb_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      mb_location: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      mb_company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_company',
          key: 'mc_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      mb_warehouse_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_warehouse',
          key: 'mw_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      mb_create_by: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      mb_created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      mb_status: {
        type: Sequelize.ENUM('ACTIVE','INACTIVE'),
        allowNull: false
      }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('master_branch');
  }
};
