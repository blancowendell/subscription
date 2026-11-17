"use strict";

// Central audit logs for all KAPS_ERP systems.
// BOOKS writes directly; other systems sync from their local audit_logs.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("audit_logs", {
      al_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      al_system: {
        type: Sequelize.ENUM("BOOKS", "INVENTORY", "OPERATIONS", "ECOM"),
        allowNull: false,
      },
      // al_id from the origin system's local audit_logs (null for BOOKS)
      al_source_log_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      al_module: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      al_action: {
        type: Sequelize.ENUM(
          "CREATE",
          "UPDATE",
          "DELETE",
          "VOID",
          "APPROVE",
          "REJECT",
          "LOGIN",
          "LOGIN_FAILED",
          "LOGOUT",
          "EXPORT",
          "PRINT",
          "SYNC",
        ),
        allowNull: false,
      },
      al_entity: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      al_entity_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      // S.O. no, invoice no, barcode, batch no
      al_reference_no: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      al_user_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      al_user_source: {
        type: Sequelize.ENUM("MASTER", "EMPLOYEE"),
        allowNull: true,
      },
      // Snapshots at time of action
      al_user_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      al_role: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      // JSON strings
      al_before: {
        type: Sequelize.TEXT("long"),
        allowNull: true,
      },
      al_after: {
        type: Sequelize.TEXT("long"),
        allowNull: true,
      },
      al_changed_fields: {
        type: Sequelize.TEXT("long"),
        allowNull: true,
      },
      al_remarks: {
        type: Sequelize.TEXT("long"),
        allowNull: true,
      },
      al_status: {
        type: Sequelize.ENUM("SUCCESS", "FAILED"),
        allowNull: false,
      },
      al_error: {
        type: Sequelize.TEXT("long"),
        allowNull: true,
      },
      // Correlation ID across systems
      al_request_id: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      al_ip: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      al_user_agent: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      al_device: {
        type: Sequelize.ENUM("WEB", "MOBILE"),
        allowNull: true,
      },
      al_created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("audit_logs", ["al_system", "al_source_log_id"], {
      name: "uq_al_system_source",
      unique: true,
    });

    await queryInterface.addIndex("audit_logs", ["al_system", "al_created_at"], {
      name: "idx_al_system_created",
    });

    await queryInterface.addIndex("audit_logs", ["al_entity", "al_entity_id"], {
      name: "idx_al_entity",
    });

    await queryInterface.addIndex("audit_logs", ["al_user_id", "al_user_source"], {
      name: "idx_al_user",
    });

    await queryInterface.addIndex("audit_logs", ["al_reference_no"], {
      name: "idx_al_reference_no",
    });

    await queryInterface.addIndex("audit_logs", ["al_request_id"], {
      name: "idx_al_request_id",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("audit_logs");
  },
};