'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('subscription', {
      s_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      s_ref: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true
      },
      s_account_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'client_account',
          key: 'ca_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      s_plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_plan',
          key: 'mp_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      s_billing_cycle: {
        type: Sequelize.ENUM('MONTHLY', 'YEARLY'),
        allowNull: false
      },
      s_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      s_is_trial: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      s_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      s_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      s_grace_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      s_cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      s_cancel_reason: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      s_status: {
        type: Sequelize.ENUM('PENDING', 'TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'),
        allowNull: false
      },
      s_create_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      s_create_by: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      s_update_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      s_update_by: {
        type: Sequelize.STRING(50),
        allowNull: true
      }
    });

    await queryInterface.addIndex('subscription', ['s_account_id', 's_status'], {
      name: 'idx_subscription_account_status'
    });
    await queryInterface.addIndex('subscription', ['s_status', 's_end_date'], {
      name: 'idx_subscription_status_end'
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('subscription');
  }
};