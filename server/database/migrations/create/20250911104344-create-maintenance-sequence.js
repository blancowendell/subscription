'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('maintenance_sequence', {
      ms_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      ms_company_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'master_company',
          key: 'mc_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ms_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      ms_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      ms_prefix: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      ms_separator: {
        type: Sequelize.STRING(5),
        allowNull: false
      },
      ms_start_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      ms_padding_length: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      ms_include_year: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      ms_year_format: {
        type: Sequelize.STRING(4),
        allowNull: true
      },
      ms_include_month: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      ms_include_day: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      ms_reset_period: {
        type: Sequelize.ENUM('NEVER', 'YEARLY', 'MONTHLY', 'DAILY'),
        allowNull: false
      },
      ms_current_number: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      ms_period_key: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      ms_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false
      },
      ms_create_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      ms_create_by: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      ms_update_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      ms_update_by: {
        type: Sequelize.STRING(50),
        allowNull: true
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('maintenance_sequence');
  }
};