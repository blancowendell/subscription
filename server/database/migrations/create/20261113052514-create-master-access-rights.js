'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_access_rights', {
      mar_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      mar_access_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_access',
          key: 'ma_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      mar_page_action_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_page_actions',
          key: 'mpa_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      mar_is_allowed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      mar_create_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      mar_create_by: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      mar_update_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      mar_update_by: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
    });

    await queryInterface.addIndex('master_access_rights', ['mar_access_id', 'mar_page_action_id'], {
      unique: true,
      name: 'uq_access_page_action',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('master_access_rights');
  },
};