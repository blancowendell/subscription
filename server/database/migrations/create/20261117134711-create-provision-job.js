'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('provision_job', {
      pj_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      pj_subscription_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'subscription',
          key: 's_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      pj_tenant_code: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      pj_action: {
        type: Sequelize.ENUM('PROVISION', 'SYNC', 'SUSPEND', 'REACTIVATE', 'ARCHIVE'),
        allowNull: false
      },
      pj_payload: {
        type: Sequelize.JSON,
        allowNull: false
      },
      pj_response: {
        type: Sequelize.JSON,
        allowNull: true
      },
      pj_attempts: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      pj_last_error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      pj_next_retry_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      pj_lock_token: {
        type: Sequelize.STRING(36),
        allowNull: true
      },
      pj_completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      pj_status: {
        type: Sequelize.ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED'),
        allowNull: false
      },
      pj_create_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      pj_create_by: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      pj_update_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      pj_update_by: {
        type: Sequelize.STRING(50),
        allowNull: true
      }
    });

    await queryInterface.addIndex('provision_job', ['pj_status', 'pj_next_retry_at'], {
      name: 'idx_provision_job_status_retry'
    });
    await queryInterface.addIndex('provision_job', ['pj_tenant_code', 'pj_id'], {
      name: 'idx_provision_job_tenant'
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('provision_job');
  }
};