'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('dashboard_widgets', {
      dw_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      dw_dashboard_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'maintenance_dashboards',
          key: 'md_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      dw_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      dw_title: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      // Grid units: 12 columns, 40px rows
      dw_position_x: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      dw_position_y: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      dw_width: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      dw_height: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      dw_created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      dw_updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('dashboard_widgets');
  },
};