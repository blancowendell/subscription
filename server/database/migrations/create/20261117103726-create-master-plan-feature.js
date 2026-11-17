'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('master_plan_feature', {
      mpf_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      mpf_plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_plan',
          key: 'mp_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      mpf_feature_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_feature',
          key: 'mf_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      mpf_limit_value: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      mpf_create_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      mpf_create_by: {
        type: Sequelize.STRING(50),
        allowNull: false
      }
    });

    await queryInterface.addIndex('master_plan_feature', ['mpf_plan_id', 'mpf_feature_id'], {
      unique: true,
      name: 'uq_master_plan_feature_plan_feature'
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('master_plan_feature');
  }
};