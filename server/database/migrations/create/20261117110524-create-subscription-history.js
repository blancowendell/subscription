'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('subscription_history', {
      sh_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      sh_subscription_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'subscription',
          key: 's_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      sh_action: {
        type: Sequelize.ENUM(
          'CREATE',
          'UPGRADE',
          'DOWNGRADE',
          'CHANGE_CYCLE',
          'RENEW',
          'EXTEND',
          'SUSPEND',
          'REACTIVATE',
          'CANCEL',
          'EXPIRE'
        ),
        allowNull: false
      },
      sh_from_plan_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'master_plan',
          key: 'mp_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      sh_to_plan_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'master_plan',
          key: 'mp_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      sh_from_status: {
        type: Sequelize.ENUM('PENDING', 'TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'),
        allowNull: true
      },
      sh_to_status: {
        type: Sequelize.ENUM('PENDING', 'TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'),
        allowNull: false
      },
      sh_from_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      sh_to_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      sh_remarks: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      sh_create_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      sh_create_by: {
        type: Sequelize.STRING(50),
        allowNull: false
      }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('subscription_history');
  }
};