'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_login', {
      ul_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },

      // other fields

      ul_created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      ul_status: {
        type: Sequelize.ENUM('ACTIVE','INACTIVE'),
        allowNull: false
      }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('user_login');
  }
};
