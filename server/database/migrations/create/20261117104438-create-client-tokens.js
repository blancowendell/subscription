'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('client_tokens', {
      ct_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      ct_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'client_users',
          key: 'cu_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      ct_type: {
        type: Sequelize.ENUM('VERIFY', 'RESET'),
        allowNull: false
      },
      ct_token_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true
      },
      ct_expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      ct_used_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      ct_create_date: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('client_tokens');
  }
};