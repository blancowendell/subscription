'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_pages', {
      mp_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      mp_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      mp_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      mp_parent_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'master_pages',
          key: 'mp_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      mp_route: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      mp_icon: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      mp_sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      mp_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      mp_create_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      mp_create_by: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      mp_update_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      mp_update_by: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('master_pages');
  },
};