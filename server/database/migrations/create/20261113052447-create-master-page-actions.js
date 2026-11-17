'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_page_actions', {
      mpa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      mpa_page_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_pages',
          key: 'mp_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      mpa_action_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_actions',
          key: 'mac_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      mpa_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      mpa_create_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      mpa_create_by: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
    });

    await queryInterface.addIndex('master_page_actions', ['mpa_page_id', 'mpa_action_id'], {
      unique: true,
      name: 'uq_page_action',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('master_page_actions');
  },
};