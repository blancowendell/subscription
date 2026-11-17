'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_access', {
      ma_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      ma_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      ma_company_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'master_company',
          key: 'mc_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ma_warehouse_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'master_warehouse',
          key: 'mw_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ma_is_system: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ma_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      ma_create_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      ma_create_by: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      ma_update_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ma_update_by: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('master_access');
  },
};