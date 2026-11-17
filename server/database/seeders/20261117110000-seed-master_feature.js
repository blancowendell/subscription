'use strict';

// Starter features, plans, and plan features for the ERP.
// Safe to run more than once:
//  - features and plans whose code already exists are skipped (admin edits are never overwritten)
//  - plan features are only seeded for a plan that has none yet

const FEATURES = [
  // CORE
  { code: 'CORE', name: 'Core (company, branches, users)', module: 'CORE', type: 'MODULE', description: 'Base ERP: company setup, branches, warehouses, users and roles', sort: 1 },
  { code: 'MAX_USERS', name: 'Max users', module: 'CORE', type: 'LIMIT', description: 'Maximum active user accounts', sort: 2 },
  { code: 'MAX_BRANCHES', name: 'Max branches', module: 'CORE', type: 'LIMIT', description: 'Maximum active branches', sort: 3 },
  { code: 'MAX_WAREHOUSES', name: 'Max warehouses', module: 'CORE', type: 'LIMIT', description: 'Maximum active warehouses', sort: 4 },

  // INVENTORY
  { code: 'INVENTORY', name: 'Inventory', module: 'INVENTORY', type: 'MODULE', description: 'Items, stock ledger, transfers, adjustments, stock counts', sort: 1 },

  // PROCUREMENT
  { code: 'PROCUREMENT', name: 'Procurement', module: 'PROCUREMENT', type: 'MODULE', description: 'Suppliers, purchase orders, receiving, supplier bills', sort: 1 },

  // PRODUCTION
  { code: 'PRODUCTION', name: 'Production / BOM', module: 'PRODUCTION', type: 'MODULE', description: 'Recipes/BOM, production orders, cost roll-up', sort: 1 },

  // ACCOUNTING
  { code: 'ACCOUNTING', name: 'Accounting', module: 'ACCOUNTING', type: 'MODULE', description: 'Chart of accounts, journals, AR/AP, cost of sales, margin reports', sort: 1 },

  // POS
  { code: 'POS_RETAIL', name: 'POS - Retail/Trading', module: 'POS', type: 'MODULE', description: 'Barcode checkout for retail and trading', sort: 1 },
  { code: 'POS_RESTAURANT', name: 'POS - Restaurant', module: 'POS', type: 'MODULE', description: 'Tables, modifiers, kitchen orders, split bills', sort: 2 },
  { code: 'POS_SERVICES', name: 'POS - Services', module: 'POS', type: 'MODULE', description: 'Appointments, staff assignment, commissions', sort: 3 },
  { code: 'MAX_POS_TERMINALS', name: 'Max POS terminals', module: 'POS', type: 'LIMIT', description: 'Maximum active POS terminals', sort: 4 },
];

// Prices are placeholders: adjust before going live.
const PLANS = [
  { code: 'BASIC', name: 'Basic', description: 'For small shops: inventory and retail POS', monthly: 999, yearly: 9990, trialDays: 14, graceDays: 7, sort: 1, isPublic: true },
  { code: 'PRO', name: 'Pro', description: 'Growing businesses: procurement, accounting, more users and branches', monthly: 2499, yearly: 24990, trialDays: 14, graceDays: 7, sort: 2, isPublic: true },
  { code: 'ENTERPRISE', name: 'Enterprise', description: 'Every module, no limits', monthly: 4999, yearly: 49990, trialDays: 0, graceDays: 14, sort: 3, isPublic: true },
];

// MODULE features: listed codes are included.
// LIMIT features: number = cap, null = unlimited.
const PLAN_FEATURES = {
  BASIC: {
    modules: ['CORE', 'INVENTORY', 'POS_RETAIL'],
    limits: { MAX_USERS: 3, MAX_BRANCHES: 1, MAX_WAREHOUSES: 1, MAX_POS_TERMINALS: 1 },
  },
  PRO: {
    modules: ['CORE', 'INVENTORY', 'PROCUREMENT', 'ACCOUNTING', 'POS_RETAIL', 'POS_SERVICES'],
    limits: { MAX_USERS: 10, MAX_BRANCHES: 3, MAX_WAREHOUSES: 3, MAX_POS_TERMINALS: 5 },
  },
  ENTERPRISE: {
    modules: ['CORE', 'INVENTORY', 'PROCUREMENT', 'PRODUCTION', 'ACCOUNTING', 'POS_RETAIL', 'POS_RESTAURANT', 'POS_SERVICES'],
    limits: { MAX_USERS: null, MAX_BRANCHES: null, MAX_WAREHOUSES: null, MAX_POS_TERMINALS: null },
  },
};

module.exports = {
  up: async (queryInterface) => {
    const createBy = process.env._SEED_CREATED_BY || 'admin';
    const now = new Date();

    // ---------- Features ----------
    const [existingFeatures] = await queryInterface.sequelize.query(
      'SELECT mf_code FROM master_feature'
    );
    const haveFeature = new Set(existingFeatures.map((r) => r.mf_code));

    const featureRows = FEATURES.filter((f) => !haveFeature.has(f.code)).map((f) => ({
      mf_code: f.code,
      mf_name: f.name,
      mf_module: f.module,
      mf_type: f.type,
      mf_description: f.description,
      mf_sort_order: f.sort,
      mf_status: 'ACTIVE',
      mf_create_date: now,
      mf_create_by: createBy,
      mf_update_date: null,
      mf_update_by: null,
    }));

    if (featureRows.length) {
      await queryInterface.bulkInsert('master_feature', featureRows);
    }

    // ---------- Plans ----------
    const [existingPlans] = await queryInterface.sequelize.query(
      'SELECT mp_code, mp_name FROM master_plan'
    );
    const havePlanCode = new Set(existingPlans.map((r) => r.mp_code));
    const havePlanName = new Set(existingPlans.map((r) => r.mp_name));

    const planRows = PLANS.filter((p) => !havePlanCode.has(p.code) && !havePlanName.has(p.name)).map((p) => ({
      mp_code: p.code,
      mp_name: p.name,
      mp_description: p.description,
      mp_price_monthly: p.monthly,
      mp_price_yearly: p.yearly,
      mp_trial_days: p.trialDays,
      mp_grace_days: p.graceDays,
      mp_sort_order: p.sort,
      mp_is_public: p.isPublic,
      mp_status: 'ACTIVE',
      mp_create_date: now,
      mp_create_by: createBy,
      mp_update_date: null,
      mp_update_by: null,
    }));

    if (planRows.length) {
      await queryInterface.bulkInsert('master_plan', planRows);
    }

    // ---------- Plan features ----------
    const [features] = await queryInterface.sequelize.query(
      'SELECT mf_id, mf_code FROM master_feature'
    );
    const featureId = Object.fromEntries(features.map((f) => [f.mf_code, f.mf_id]));

    const [plans] = await queryInterface.sequelize.query(
      'SELECT mp_id, mp_code FROM master_plan WHERE mp_code IN (:codes)',
      { replacements: { codes: PLANS.map((p) => p.code) } }
    );

    const [assigned] = await queryInterface.sequelize.query(
      'SELECT DISTINCT mpf_plan_id FROM master_plan_feature'
    );
    const planHasFeatures = new Set(assigned.map((r) => r.mpf_plan_id));

    const planFeatureRows = [];
    plans.forEach((plan) => {
      if (planHasFeatures.has(plan.mp_id)) return; // admin already set this plan up

      const setup = PLAN_FEATURES[plan.mp_code];
      if (!setup) return;

      setup.modules.forEach((code) => {
        if (!featureId[code]) return;
        planFeatureRows.push({
          mpf_plan_id: plan.mp_id,
          mpf_feature_id: featureId[code],
          mpf_limit_value: null,
          mpf_create_date: now,
          mpf_create_by: createBy,
        });
      });

      Object.entries(setup.limits).forEach(([code, limit]) => {
        if (!featureId[code]) return;
        planFeatureRows.push({
          mpf_plan_id: plan.mp_id,
          mpf_feature_id: featureId[code],
          mpf_limit_value: limit,
          mpf_create_date: now,
          mpf_create_by: createBy,
        });
      });
    });

    if (planFeatureRows.length) {
      await queryInterface.bulkInsert('master_plan_feature', planFeatureRows);
    }
  },

  down: async (queryInterface) => {
    const planCodes = PLANS.map((p) => p.code);
    const featureCodes = FEATURES.map((f) => f.code);

    // Seeded plans that no subscription uses: remove their features, then the plans.
    await queryInterface.sequelize.query(
      `DELETE mpf FROM master_plan_feature mpf
        INNER JOIN master_plan mp ON mp.mp_id = mpf.mpf_plan_id
        WHERE mp.mp_code IN (:planCodes)
          AND mp.mp_id NOT IN (SELECT s_plan_id FROM subscription)`,
      { replacements: { planCodes } }
    );

    await queryInterface.sequelize.query(
      `DELETE FROM master_plan
        WHERE mp_code IN (:planCodes)
          AND mp_id NOT IN (SELECT s_plan_id FROM subscription)
          AND mp_id NOT IN (SELECT mpf_plan_id FROM master_plan_feature)`,
      { replacements: { planCodes } }
    );

    // Seeded features that no plan uses.
    await queryInterface.sequelize.query(
      `DELETE FROM master_feature
        WHERE mf_code IN (:featureCodes)
          AND mf_id NOT IN (SELECT mpf_feature_id FROM master_plan_feature)`,
      { replacements: { featureCodes } }
    );
  },
};