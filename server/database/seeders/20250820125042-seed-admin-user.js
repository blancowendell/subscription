"use strict";

require('dotenv').config();

const { EncrypterString } = require('../../services/repository/cryptography');
const { STATIC_ROLE } = require('../../services/repository/enum/enums');

const {
  _SEED_CREATED_BY,
  _SEED_ADMIN_USERNAME,
  _SEED_ADMIN_PASSWORD,
  _SEED_COMPANY_CODE,
  _SEED_COMPANY_NAME,
  _SEED_COMPANY_ADDRESS,
} = process.env;

if (!_SEED_CREATED_BY || !_SEED_ADMIN_USERNAME || !_SEED_ADMIN_PASSWORD) {
  throw new Error('Missing _SEED_CREATED_BY, _SEED_ADMIN_USERNAME or _SEED_ADMIN_PASSWORD in .env');
}

if (!_SEED_COMPANY_CODE || !_SEED_COMPANY_NAME) {
  throw new Error('Missing _SEED_COMPANY_CODE or _SEED_COMPANY_NAME in .env');
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const now = new Date();

      // Step 1: Default company
      await queryInterface.bulkInsert('master_company', [
        {
          mc_code: _SEED_COMPANY_CODE,
          mc_name: _SEED_COMPANY_NAME,
          mc_address: _SEED_COMPANY_ADDRESS || null,
          mc_created_at: now,
          mc_created_by: _SEED_CREATED_BY,
          mc_status: 'ACTIVE',
        },
      ], { transaction });

      // Step 2: System access (global, no company)
      await queryInterface.bulkInsert('master_access', [
        {
          ma_name: STATIC_ROLE.ADMIN,
          ma_company_id: null,
          ma_is_system: true,
          ma_status: 'ACTIVE',
          ma_create_date: now,
          ma_create_by: _SEED_CREATED_BY,
        },
      ], { transaction });

      const [access] = await queryInterface.sequelize.query(
        `SELECT ma_id FROM master_access WHERE ma_name = :name LIMIT 1`,
        { replacements: { name: STATIC_ROLE.ADMIN }, transaction }
      );

      // Step 3: Admin user (global, sees every company)
      await queryInterface.bulkInsert('master_users', [
        {
          mu_access_id: access[0].ma_id,
          mu_username: EncrypterString(_SEED_ADMIN_USERNAME),
          mu_password: EncrypterString(_SEED_ADMIN_PASSWORD),
          mu_status: 'ACTIVE',
          mu_is_update_password: true,
          mu_create_date: now,
          mu_create_by: _SEED_CREATED_BY,
        },
      ], { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.bulkDelete('master_users', { mu_create_by: _SEED_CREATED_BY }, { transaction });
      await queryInterface.bulkDelete('master_access', { ma_name: STATIC_ROLE.ADMIN, ma_is_system: true }, { transaction });
      await queryInterface.bulkDelete('master_company', { mc_code: _SEED_COMPANY_CODE }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};