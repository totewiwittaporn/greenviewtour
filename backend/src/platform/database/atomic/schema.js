// Generated schema metadata; no application records.
export const schema = {
  "hashes": {
    "source": "78eb09bc4953f8ec6dcdac3a32141813cf29f1efe04a7763668264f3d7808c78",
    "target": "108b948293e0f84f9a0184db5d6bef80592769ef915b6d41043a9dded031f543",
    "0001_baseline.sql": "ff8aa4f1bf29d2eaa8f2770e2d480de670a5d2f9c684902bf8a4156f6166161a",
    "0002_scalar_array_lookups.sql": "869549e3f29c1f7cffefdcc6a914a1b61552d0d9f45cc81e5e25994d9cb6edf0",
    "0003_json_range_projections.sql": "cec48c21dbfd89d81d3d7e5f4a3ec99a51a087485e0df0b5eff665b6f96410ff",
    "0004_atomic_unit_of_work.sql": "28cdd6d321522fa483c06b5a4879ceaa87be02a9bd3cb388682c368e1a541813",
    "0005_json_projection_null_values.sql": "ef19a1f9d0c328b46f32657676d10b04e4dbb878a2a9f0780566cfd7bde5848a",
    "0006_identity_optional_created_at.sql": "d3975c8111612a0944e71bd4940a9fcd3a7308946517cf4c78ea065c63605501",
    "0007_local_auth_sessions.sql": "3ec1b6f56c0a7f56e61e225162d775d28b9a9d5cb19c09b544e4f64b7c1b928b",
    "0008_staff_line_link.sql": "043d5bc4b761cfcd22146553b75f3a9810938996a96a46a49e4c89e4351a2b57",
    "0009_company_public_contact.sql": "9af613b7f0f9d6c8e0448471b021f9cdeabe1ea8e2ee8c8961329c244e8689f0",
    "0010_staff_daily_digest.sql": "0f2b6e513f4582146d22544da4a04e83d1671cf82d3eebe638d928e3720c2bdc",
    "0011_employee_onboarding.sql": "0ac662eaf69d93fecada4cebc1b2c1dc4ac6adfa7254ff7a92ec92eea06ffa93",
    "0012_onboarding_structured_address.sql": "7b43df7628988f6dc1ff3e59ac9376078b0e4bb5d8c2455c19bb34b23d4d758a",
    "0013_undated_booking_drafts.sql": "946358d03e051cbb4848b805bcf6e9270ac95ffc6e72802e341aa4bd02356416",
    "0014_immutable_price_history.sql": "83742c2dd5fca9de31f1d60728a3d0464dd9f87ecbe7174bd5dc7d130e11c291"
  },
  "tables": {
    "AgentAgreement": {
      "relations": {
        "agent": "BusinessPartner",
        "rates": "AgentTourPrice"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "agentId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "startsOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "endsOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "signedOn",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "evidenceUrl",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2048
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'ACTIVE'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "code"
        ]
      ],
      "foreignKeys": [
        {
          "table": "BusinessPartner",
          "fields": [
            "agentId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "AgentBill": {
      "relations": {
        "lines": "AgentBillLine",
        "payments": "AgentPayment"
      },
      "columns": [
        {
          "name": "billingPolicySnapshot",
          "type": "JSONB",
          "required": false,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "originalDueOn",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "promisedOn",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "rescheduleHistory",
          "type": "JSONB",
          "required": true,
          "default": "[]",
          "kind": "Json"
        },
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "title",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            160
          ]
        },
        {
          "name": "agentId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "agentName",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "total",
          "type": "DECIMAL",
          "required": true,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            14,
            2
          ]
        },
        {
          "name": "paid",
          "type": "DECIMAL",
          "required": true,
          "default": "0",
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            14,
            2
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'OPEN'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "dueOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "snapshot",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "createdBy",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": []
    },
    "AgentBillLine": {
      "relations": {
        "booking": "TourBooking",
        "bill": "AgentBill"
      },
      "columns": [
        {
          "name": "bookingId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "billId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        }
      ],
      "pk": [
        "bookingId"
      ],
      "unique": [
        [
          "bookingId"
        ]
      ],
      "foreignKeys": [
        {
          "table": "AgentBill",
          "fields": [
            "billId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "TourBooking",
          "fields": [
            "bookingId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "AgentMarginOffset": {
      "relations": {},
      "columns": [
        {
          "name": "bookingId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "receiptId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "billId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "amount",
          "type": "DECIMAL",
          "required": true,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            14,
            2
          ]
        },
        {
          "name": "recordedBy",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "receiptId",
          "billId"
        ]
      ],
      "foreignKeys": []
    },
    "AgentPayment": {
      "relations": {
        "bill": "AgentBill"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "billId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "amount",
          "type": "DECIMAL",
          "required": true,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            14,
            2
          ]
        },
        {
          "name": "receivedOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "reference",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            300
          ]
        },
        {
          "name": "recordedBy",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": [
        {
          "table": "AgentBill",
          "fields": [
            "billId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "AgentRefundClaim": {
      "relations": {},
      "columns": [
        {
          "name": "receiptId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "recordId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        }
      ],
      "pk": [
        "receiptId"
      ],
      "unique": [
        [
          "receiptId"
        ],
        [
          "recordId"
        ]
      ],
      "foreignKeys": []
    },
    "AgentTourPrice": {
      "relations": {
        "agreement": "AgentAgreement",
        "agent": "BusinessPartner",
        "tour": "TourProgram"
      },
      "columns": [
        {
          "name": "agreementId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "agentId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "tourId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "adultPrice",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "childPrice",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "agentId",
          "tourId",
          "agreementId"
        ]
      ],
      "foreignKeys": [
        {
          "table": "TourProgram",
          "fields": [
            "tourId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "BusinessPartner",
          "fields": [
            "agentId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "AgentAgreement",
          "fields": [
            "agreementId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "AuditEvent": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "actorId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "action",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "targetId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "details",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": []
    },
    "AuthAccount": {
      "relations": {
        "user": "AuthUser"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "accountId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "providerId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "userId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "accessToken",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "refreshToken",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "idToken",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "accessTokenExpiresAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "refreshTokenExpiresAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "scope",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "password",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime"
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime"
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "providerId",
          "accountId"
        ]
      ],
      "foreignKeys": [
        {
          "table": "AuthUser",
          "fields": [
            "userId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "CASCADE"
        }
      ]
    },
    "AuthSession": {
      "relations": {
        "user": "AuthUser",
        "webSessions": "WebSession"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "token",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "expiresAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime"
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "ipAddress",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "userAgent",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "userId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "token"
        ]
      ],
      "foreignKeys": [
        {
          "table": "AuthUser",
          "fields": [
            "userId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "CASCADE"
        }
      ]
    },
    "AuthUser": {
      "relations": {
        "accounts": "AuthAccount",
        "sessions": "AuthSession",
        "webSessions": "WebSession"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "email",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "emailVerified",
          "type": "BOOLEAN",
          "required": true,
          "default": "false",
          "kind": "Boolean"
        },
        {
          "name": "image",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime"
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "sourceCreatedAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "disabled",
          "type": "BOOLEAN",
          "required": true,
          "default": "false",
          "kind": "Boolean"
        },
        {
          "name": "bannedUntil",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime"
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "email"
        ]
      ],
      "foreignKeys": []
    },
    "AuthVerification": {
      "relations": {
        "webSessions": "WebSession"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "identifier",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "value",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "expiresAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime"
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime"
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "identifier"
        ]
      ],
      "foreignKeys": []
    },
    "BookingAttendance": {
      "relations": {
        "booking": "TourBooking"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "bookingId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "serviceDate",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "direction",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "adults",
          "type": "INTEGER",
          "required": true,
          "default": "0",
          "kind": "Int"
        },
        {
          "name": "children",
          "type": "INTEGER",
          "required": true,
          "default": "0",
          "kind": "Int"
        },
        {
          "name": "noShowAdults",
          "type": "INTEGER",
          "required": true,
          "default": "0",
          "kind": "Int"
        },
        {
          "name": "noShowChildren",
          "type": "INTEGER",
          "required": true,
          "default": "0",
          "kind": "Int"
        },
        {
          "name": "reason",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "financeStatus",
          "type": "TEXT",
          "required": true,
          "default": "'NONE'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "financeReason",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "financeReviewedBy",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "changes",
          "type": "JSONB",
          "required": true,
          "default": "[]",
          "kind": "Json"
        },
        {
          "name": "updatedBy",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "bookingId",
          "serviceDate",
          "direction"
        ]
      ],
      "foreignKeys": [
        {
          "table": "TourBooking",
          "fields": [
            "bookingId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "BookingCommissionClaim": {
      "relations": {},
      "columns": [
        {
          "name": "bookingId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "recordId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "bookingId"
      ],
      "unique": [
        [
          "bookingId"
        ],
        [
          "recordId"
        ]
      ],
      "foreignKeys": []
    },
    "BookingComponent": {
      "relations": {
        "dispatchAssignments": "DispatchAssignment",
        "booking": "TourBooking",
        "resource": "OperationResource",
        "slot": "ServiceSlot",
        "source": "StockLocation",
        "issues": "StockIssue"
      },
      "columns": [
        {
          "name": "dispatchDirection",
          "type": "TEXT",
          "required": true,
          "default": "'BOTH'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "bookingId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "resourceId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "slotId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "sourceId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "quantity",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "issuedQty",
          "type": "INTEGER",
          "required": true,
          "default": "0",
          "kind": "Int"
        },
        {
          "name": "selected",
          "type": "BOOLEAN",
          "required": true,
          "default": null,
          "kind": "Boolean"
        },
        {
          "name": "included",
          "type": "BOOLEAN",
          "required": true,
          "default": null,
          "kind": "Boolean"
        },
        {
          "name": "usagePoint",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "snapshot",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "unitPrice",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": [
        {
          "table": "StockLocation",
          "fields": [
            "sourceId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "ServiceSlot",
          "fields": [
            "slotId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "OperationResource",
          "fields": [
            "resourceId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "TourBooking",
          "fields": [
            "bookingId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "BookingReceipt": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "bookingId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "agentId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "payer",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "basis",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "received",
          "type": "DECIMAL",
          "required": true,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            14,
            2
          ]
        },
        {
          "name": "net",
          "type": "DECIMAL",
          "required": true,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            14,
            2
          ]
        },
        {
          "name": "margin",
          "type": "DECIMAL",
          "required": true,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            14,
            2
          ]
        },
        {
          "name": "refunded",
          "type": "DECIMAL",
          "required": true,
          "default": "0",
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            14,
            2
          ]
        },
        {
          "name": "receivedOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "reference",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            300
          ]
        },
        {
          "name": "recordedBy",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": []
    },
    "BookingSequence": {
      "relations": {},
      "columns": [
        {
          "name": "year",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "value",
          "type": "INTEGER",
          "required": true,
          "default": "0",
          "kind": "Int"
        }
      ],
      "pk": [
        "year"
      ],
      "unique": [
        [
          "year"
        ]
      ],
      "foreignKeys": []
    },
    "BusinessPartner": {
      "relations": {
        "agreements": "AgentAgreement",
        "services": "OperationResource",
        "tours": "TourProgram",
        "agentPrices": "AgentTourPrice",
        "bookings": "TourBooking",
        "vehicles": "FleetVehicle"
      },
      "columns": [
        {
          "name": "billingMode",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "billingCycleCount",
          "type": "INTEGER",
          "required": false,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "billingCycleUnit",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            10
          ]
        },
        {
          "name": "billingCycleAnchor",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "creditCount",
          "type": "INTEGER",
          "required": false,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "creditUnit",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            10
          ]
        },
        {
          "name": "creditAnchor",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "shortName",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            10
          ]
        },
        {
          "name": "bookingCommissionEligible",
          "type": "BOOLEAN",
          "required": true,
          "default": "false",
          "kind": "Boolean"
        },
        {
          "name": "allowedPaymentTerms",
          "type": "JSONB",
          "required": true,
          "default": "[\"PREPAID\",\"PAID\",\"COUNTER\",\"AGENT_CREDIT\"]",
          "kind": "String[]"
        },
        {
          "name": "defaultPaymentTerms",
          "type": "TEXT",
          "required": true,
          "default": "'COUNTER'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "roles",
          "type": "JSONB",
          "required": true,
          "default": "[]",
          "kind": "String[]"
        },
        {
          "name": "contactName",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "phone",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            32
          ]
        },
        {
          "name": "email",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            254
          ]
        },
        {
          "name": "address",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "association",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "paymentTerms",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "province",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "district",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "subdistrict",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "postalCode",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            5
          ]
        },
        {
          "name": "houseNumber",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "moo",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "villageName",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            150
          ]
        },
        {
          "name": "mapUrl",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2048
          ]
        },
        {
          "name": "latitude",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "longitude",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "code"
        ]
      ],
      "foreignKeys": []
    },
    "CapacityHold": {
      "relations": {
        "pool": "CapacityPool",
        "request": "CustomerRequest"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "poolId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "requestId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "passengers",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "exclusive",
          "type": "BOOLEAN",
          "required": true,
          "default": "false",
          "kind": "Boolean"
        },
        {
          "name": "expiresAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "poolId",
          "requestId"
        ]
      ],
      "foreignKeys": [
        {
          "table": "CustomerRequest",
          "fields": [
            "requestId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "CapacityPool",
          "fields": [
            "poolId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "CapacityOffer": {
      "relations": {
        "pool": "CapacityPool",
        "vehicle": "FleetVehicle"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "poolId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "vehicleId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "capacity",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "poolId",
          "vehicleId"
        ]
      ],
      "foreignKeys": [
        {
          "table": "FleetVehicle",
          "fields": [
            "vehicleId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "CapacityPool",
          "fields": [
            "poolId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "CapacityPool": {
      "relations": {
        "offers": "CapacityOffer",
        "holds": "CapacityHold"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "kind",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "serviceDate",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "direction",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "startsAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "endsAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "resourceIds",
          "type": "JSONB",
          "required": true,
          "default": "[]",
          "kind": "String[]",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'ACTIVE'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "holdMinutes",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "overnightLoadTenths",
          "type": "INTEGER",
          "required": true,
          "default": "12",
          "kind": "Int"
        },
        {
          "name": "notes",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "code"
        ]
      ],
      "foreignKeys": []
    },
    "CompanySettings": {
      "relations": {},
      "columns": [
        {
          "name": "bankName",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "bankAccountName",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "bankAccountNumber",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "paymentInstructions",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "legalName",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "taxId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "address",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "phone",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            32
          ]
        },
        {
          "name": "email",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            254
          ]
        },
        {
          "name": "province",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "district",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "subdistrict",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "postalCode",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            5
          ]
        },
        {
          "name": "houseNumber",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "moo",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "villageName",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            150
          ]
        },
        {
          "name": "mapUrl",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2048
          ]
        },
        {
          "name": "latitude",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "longitude",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "lineId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "instagramUrl",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": []
    },
    "CompanyWorkCommand": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "requestHash",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "result",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "actorId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": []
    },
    "CompanyWorkRecord": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "kind",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'DRAFT'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "payload",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "parentId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "dueOn",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "assigneeId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "storeId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "createdById",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "approvedById",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "completedById",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "commandHash",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "parentId",
          "dueOn"
        ]
      ],
      "foreignKeys": []
    },
    "CustomerProfile": {
      "relations": {
        "requests": "CustomerRequest"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "authUserId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "displayName",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "nickname",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "email",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            254
          ]
        },
        {
          "name": "phone",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            32
          ]
        },
        {
          "name": "lineId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'ACTIVE'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "authUserId"
        ]
      ],
      "foreignKeys": []
    },
    "CustomerRequest": {
      "relations": {
        "capacityHolds": "CapacityHold",
        "tour": "TourProgram",
        "promotion": "TourPromotion",
        "booking": "TourBooking",
        "customer": "CustomerProfile"
      },
      "columns": [
        {
          "name": "holdUntil",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "customerId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "tourId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "promotionId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "serviceDate",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "adults",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "children",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'REQUESTED'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "requestHash",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            64
          ]
        },
        {
          "name": "snapshot",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "details",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "bookingId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "staffNote",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "bookingId"
        ]
      ],
      "foreignKeys": [
        {
          "table": "CustomerProfile",
          "fields": [
            "customerId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "TourBooking",
          "fields": [
            "bookingId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "TourPromotion",
          "fields": [
            "promotionId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "TourProgram",
          "fields": [
            "tourId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "D1BusinessPartnerPaymentTerm": {
      "relations": {},
      "columns": [
        {
          "name": "ownerId",
          "type": "TEXT",
          "required": true,
          "default": null
        },
        {
          "name": "value",
          "type": "TEXT",
          "required": true,
          "default": null
        }
      ],
      "pk": [
        "ownerId",
        "value"
      ],
      "unique": [
        [
          "ownerId",
          "value"
        ]
      ],
      "foreignKeys": []
    },
    "D1BusinessPartnerRole": {
      "relations": {},
      "columns": [
        {
          "name": "ownerId",
          "type": "TEXT",
          "required": true,
          "default": null
        },
        {
          "name": "value",
          "type": "TEXT",
          "required": true,
          "default": null
        }
      ],
      "pk": [
        "ownerId",
        "value"
      ],
      "unique": [
        [
          "ownerId",
          "value"
        ]
      ],
      "foreignKeys": []
    },
    "D1CapacityPoolResource": {
      "relations": {},
      "columns": [
        {
          "name": "ownerId",
          "type": "TEXT",
          "required": true,
          "default": null
        },
        {
          "name": "value",
          "type": "TEXT",
          "required": true,
          "default": null
        }
      ],
      "pk": [
        "ownerId",
        "value"
      ],
      "unique": [
        [
          "ownerId",
          "value"
        ]
      ],
      "foreignKeys": []
    },
    "D1FleetVehiclePurpose": {
      "relations": {},
      "columns": [
        {
          "name": "ownerId",
          "type": "TEXT",
          "required": true,
          "default": null
        },
        {
          "name": "value",
          "type": "TEXT",
          "required": true,
          "default": null
        }
      ],
      "pk": [
        "ownerId",
        "value"
      ],
      "unique": [
        [
          "ownerId",
          "value"
        ]
      ],
      "foreignKeys": []
    },
    "D1Identity": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null
        },
        {
          "name": "email",
          "type": "TEXT",
          "required": true,
          "default": null
        },
        {
          "name": "email_confirmed_at",
          "type": "DATETIME",
          "required": false,
          "default": null
        },
        {
          "name": "created_at",
          "type": "DATETIME",
          "required": false,
          "default": null
        },
        {
          "name": "last_sign_in_at",
          "type": "DATETIME",
          "required": false,
          "default": null
        },
        {
          "name": "provider",
          "type": "TEXT",
          "required": true,
          "default": "'supabase-source'"
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "email"
        ]
      ],
      "foreignKeys": []
    },
    "D1JsonProjection": {
      "relations": {},
      "columns": [
        {
          "name": "source",
          "type": "TEXT",
          "required": true,
          "default": null
        },
        {
          "name": "ownerId",
          "type": "TEXT",
          "required": true,
          "default": null
        },
        {
          "name": "textValue",
          "type": "TEXT",
          "required": true,
          "default": null
        }
      ],
      "pk": [
        "source",
        "ownerId"
      ],
      "unique": [
        [
          "source",
          "ownerId"
        ]
      ],
      "foreignKeys": []
    },
    "D1TourBookingSpecialRequirement": {
      "relations": {},
      "columns": [
        {
          "name": "ownerId",
          "type": "TEXT",
          "required": true,
          "default": null
        },
        {
          "name": "value",
          "type": "TEXT",
          "required": true,
          "default": null
        }
      ],
      "pk": [
        "ownerId",
        "value"
      ],
      "unique": [
        [
          "ownerId",
          "value"
        ]
      ],
      "foreignKeys": []
    },
    "D1WarehouseResponsibilityDeputy": {
      "relations": {},
      "columns": [
        {
          "name": "ownerId",
          "type": "TEXT",
          "required": true,
          "default": null
        },
        {
          "name": "value",
          "type": "TEXT",
          "required": true,
          "default": null
        }
      ],
      "pk": [
        "ownerId",
        "value"
      ],
      "unique": [
        [
          "ownerId",
          "value"
        ]
      ],
      "foreignKeys": []
    },
    "DispatchAssignment": {
      "relations": {
        "run": "DispatchRun",
        "bookingLine": "BookingComponent"
      },
      "columns": [
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'ASSIGNED'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "cancellationReason",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "runId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "bookingLineId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "adults",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "children",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "pickupAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "dropoffPoint",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "notes",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "actualAdults",
          "type": "INTEGER",
          "required": false,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "actualChildren",
          "type": "INTEGER",
          "required": false,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "changeReason",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "runId",
          "bookingLineId"
        ]
      ],
      "foreignKeys": [
        {
          "table": "BookingComponent",
          "fields": [
            "bookingLineId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "DispatchRun",
          "fields": [
            "runId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "DispatchRun": {
      "relations": {
        "slot": "ServiceSlot",
        "staff": "DispatchStaff",
        "assignments": "DispatchAssignment"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "kind",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "direction",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "period",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "capacity",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'OPEN'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "slotId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "requestHash",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Char",
          "nativeArgs": [
            64
          ]
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "slotId"
        ],
        [
          "code"
        ]
      ],
      "foreignKeys": [
        {
          "table": "ServiceSlot",
          "fields": [
            "slotId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "DispatchStaff": {
      "relations": {
        "run": "DispatchRun",
        "user": "UserProfile"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "runId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "userId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "role",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "runId",
          "userId"
        ]
      ],
      "foreignKeys": [
        {
          "table": "UserProfile",
          "fields": [
            "userId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "DispatchRun",
          "fields": [
            "runId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "DocumentAsset": {
      "relations": {},
      "columns": [
        {
          "name": "key",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            80
          ]
        },
        {
          "name": "mimeType",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "objectKey",
          "type": "TEXT",
          "required": true,
          "default": null
        },
        {
          "name": "sha256",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Char",
          "nativeArgs": [
            64
          ]
        },
        {
          "name": "sourceUrl",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2048
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "key"
      ],
      "unique": [
        [
          "key"
        ],
        [
          "objectKey"
        ]
      ],
      "foreignKeys": []
    },
    "EmployeeOnboarding": {
      "relations": {},
      "columns": [
        {
          "name": "invitationId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "userId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "emailVerifiedAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "profileCompletedAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "passwordSetAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "completedAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "emailSentAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "firstName",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "lastName",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "address",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "primaryPhone",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "addressDetails",
          "type": "JSON",
          "required": false,
          "default": null,
          "kind": "Json"
        }
      ],
      "pk": [
        "invitationId"
      ],
      "unique": [
        [
          "invitationId"
        ],
        [
          "userId"
        ]
      ],
      "foreignKeys": [
        {
          "table": "AuthUser",
          "fields": [
            "userId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "NO ACTION",
          "onDelete": "RESTRICT"
        },
        {
          "table": "Invitation",
          "fields": [
            "invitationId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "NO ACTION",
          "onDelete": "CASCADE"
        }
      ]
    },
    "EvidenceAttachment": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "targetKind",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            32
          ]
        },
        {
          "name": "targetId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "uploadedBy",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "filename",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "mimeType",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "size",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "sha256",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            64
          ]
        },
        {
          "name": "objectKey",
          "type": "TEXT",
          "required": true,
          "default": null
        },
        {
          "name": "note",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "documentNumber",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "category",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "requestHash",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            64
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "objectKey"
        ]
      ],
      "foreignKeys": []
    },
    "FinancePersonnelCommand": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "actorId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "requestHash",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            64
          ]
        },
        {
          "name": "result",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": []
    },
    "FinancePersonnelRecord": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "kind",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "title",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            160
          ]
        },
        {
          "name": "employeeId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "payload",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'DRAFT'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdBy",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "approvedBy",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "payment",
          "type": "JSONB",
          "required": false,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "clearance",
          "type": "JSONB",
          "required": false,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": []
    },
    "FleetVehicle": {
      "relations": {
        "capacityOffers": "CapacityOffer",
        "slots": "ServiceSlot",
        "provider": "BusinessPartner"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "kind",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "capacity",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "engineCount",
          "type": "INTEGER",
          "required": false,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "totalCapacity",
          "type": "INTEGER",
          "required": false,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "expectedCrew",
          "type": "INTEGER",
          "required": false,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "purposes",
          "type": "JSONB",
          "required": true,
          "default": "[]",
          "kind": "String[]"
        },
        {
          "name": "hireCost",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "commissionType",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "commissionValue",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "ownership",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "providerId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "registration",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "notes",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "code"
        ]
      ],
      "foreignKeys": [
        {
          "table": "BusinessPartner",
          "fields": [
            "providerId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "GuideAssignment": {
      "relations": {
        "booking": "TourBooking",
        "guide": "UserProfile"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "bookingId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "guideId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "startsAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "endsAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'PLANNED'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "notes",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "requestHash",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            64
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": [
        {
          "table": "UserProfile",
          "fields": [
            "guideId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "TourBooking",
          "fields": [
            "bookingId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "Invitation": {
      "relations": {
        "roles": "InvitationRole"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "email",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            254
          ]
        },
        {
          "name": "tokenHash",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Char",
          "nativeArgs": [
            64
          ]
        },
        {
          "name": "displayName",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "department",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "acceptedAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "revokedAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "createdById",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "expiresAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "consumedAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "tokenHash"
        ],
        [
          "email"
        ]
      ],
      "foreignKeys": []
    },
    "InvitationRole": {
      "relations": {
        "invitation": "Invitation",
        "role": "Role"
      },
      "columns": [
        {
          "name": "invitationId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "roleCode",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "scope",
          "type": "TEXT",
          "required": true,
          "default": "'SELF'",
          "kind": "AccessScope",
          "enum": [
            "SELF",
            "COMPANY"
          ]
        }
      ],
      "pk": [
        "invitationId",
        "roleCode",
        "scope"
      ],
      "unique": [
        [
          "invitationId",
          "roleCode",
          "scope"
        ]
      ],
      "foreignKeys": [
        {
          "table": "Role",
          "fields": [
            "roleCode"
          ],
          "references": [
            "code"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "Invitation",
          "fields": [
            "invitationId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "CASCADE"
        }
      ]
    },
    "LocalMail": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "kind",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "recipient",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "link",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime"
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": []
    },
    "OperationCommand": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "requestHash",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Char",
          "nativeArgs": [
            64
          ]
        },
        {
          "name": "result",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": []
    },
    "OperationDailySnapshot": {
      "relations": {
        "outbox": "OperationNotificationOutbox"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "serviceDate",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "kind",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "revision",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "contentHash",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Char",
          "nativeArgs": [
            64
          ]
        },
        {
          "name": "runs",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "actorId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "serviceDate",
          "kind",
          "revision"
        ]
      ],
      "foreignKeys": []
    },
    "OperationNotificationOutbox": {
      "relations": {
        "snapshot": "OperationDailySnapshot"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "snapshotId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "serviceDate",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "revision",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'PREPARED'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "retryKey",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "payload",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "attempts",
          "type": "INTEGER",
          "required": true,
          "default": "0",
          "kind": "Int"
        },
        {
          "name": "firstAttemptAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "lastAttemptAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "retryKey"
        ],
        [
          "snapshotId"
        ]
      ],
      "foreignKeys": [
        {
          "table": "OperationDailySnapshot",
          "fields": [
            "snapshotId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "OperationResource": {
      "relations": {
        "provider": "BusinessPartner",
        "components": "ProgramComponent",
        "slots": "ServiceSlot",
        "lots": "StockLot",
        "bookingLines": "BookingComponent"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "kind",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "category",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "baseUnit",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "ownership",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "mealPeriod",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "accommodationType",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "occupancy",
          "type": "INTEGER",
          "required": false,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "serviceMode",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "verificationStatus",
          "type": "TEXT",
          "required": true,
          "default": "'UNVERIFIED'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "packSize",
          "type": "INTEGER",
          "required": false,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "caseSize",
          "type": "INTEGER",
          "required": false,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "size",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "providerId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "origin",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "destination",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "salePrice",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "costPrice",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "notes",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "code"
        ]
      ],
      "foreignKeys": [
        {
          "table": "BusinessPartner",
          "fields": [
            "providerId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "OperationTrip": {
      "relations": {
        "tour": "TourProgram",
        "bookings": "TourBooking"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "tourId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "startsAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "endsAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "capacity",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'OPEN'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "notes",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "code"
        ]
      ],
      "foreignKeys": [
        {
          "table": "TourProgram",
          "fields": [
            "tourId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "Permission": {
      "relations": {
        "roles": "RolePermission"
      },
      "columns": [
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "description",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        }
      ],
      "pk": [
        "code"
      ],
      "unique": [
        [
          "code"
        ]
      ],
      "foreignKeys": []
    },
    "PersonalLineDelivery": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "eventId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "userId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "mode",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "recipient",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            33
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "eventId",
          "userId",
          "mode"
        ]
      ],
      "foreignKeys": []
    },
    "PickupLocation": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "kind",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "zone",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "address",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "latitude",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "longitude",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "pickupNotes",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "province",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "district",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "subdistrict",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "postalCode",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            5
          ]
        },
        {
          "name": "houseNumber",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "moo",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "villageName",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            150
          ]
        },
        {
          "name": "mapUrl",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2048
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "code"
        ]
      ],
      "foreignKeys": []
    },
    "ProgramComponent": {
      "relations": {
        "tour": "TourProgram",
        "resource": "OperationResource"
      },
      "columns": [
        {
          "name": "removalCredit",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "tourId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "resourceId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "selection",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "basis",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "quantity",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "usagePoint",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "day",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "notes",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": [
        {
          "table": "OperationResource",
          "fields": [
            "resourceId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "TourProgram",
          "fields": [
            "tourId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "PurchaseOrder": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'DRAFT'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "supplierId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "storeId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "lines",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "total",
          "type": "DECIMAL",
          "required": true,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            12,
            2
          ]
        },
        {
          "name": "receivedTotal",
          "type": "DECIMAL",
          "required": true,
          "default": "0",
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            12,
            2
          ]
        },
        {
          "name": "requestId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "reason",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "quotationUrl",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2048
          ]
        },
        {
          "name": "createdById",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "approvedById",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "commandHash",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": []
    },
    "Role": {
      "relations": {
        "users": "UserRole",
        "permissions": "RolePermission",
        "invitations": "InvitationRole"
      },
      "columns": [
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        }
      ],
      "pk": [
        "code"
      ],
      "unique": [
        [
          "code"
        ]
      ],
      "foreignKeys": []
    },
    "RolePermission": {
      "relations": {
        "role": "Role",
        "permission": "Permission"
      },
      "columns": [
        {
          "name": "roleCode",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "permissionCode",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        }
      ],
      "pk": [
        "roleCode",
        "permissionCode"
      ],
      "unique": [
        [
          "roleCode",
          "permissionCode"
        ]
      ],
      "foreignKeys": [
        {
          "table": "Permission",
          "fields": [
            "permissionCode"
          ],
          "references": [
            "code"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "CASCADE"
        },
        {
          "table": "Role",
          "fields": [
            "roleCode"
          ],
          "references": [
            "code"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "CASCADE"
        }
      ]
    },
    "SalesChannel": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "kind",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "code"
        ]
      ],
      "foreignKeys": []
    },
    "ServiceDayClose": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "serviceDate",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'CLOSED'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "snapshot",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "reason",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "updatedBy",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "serviceDate"
        ]
      ],
      "foreignKeys": []
    },
    "ServiceSlot": {
      "relations": {
        "run": "DispatchRun",
        "resource": "OperationResource",
        "vehicle": "FleetVehicle",
        "bookingLines": "BookingComponent"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "resourceId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "vehicleId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "startsAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "endsAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "capacity",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "code"
        ]
      ],
      "foreignKeys": [
        {
          "table": "FleetVehicle",
          "fields": [
            "vehicleId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "OperationResource",
          "fields": [
            "resourceId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "StaffDailyDigest": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "retryKey",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "sourceId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "userId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "serviceDate",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "channelKey",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "mode",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "revision",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "contentHash",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "bindingVersion",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "payload",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "attempts",
          "type": "INTEGER",
          "required": true,
          "default": "0",
          "kind": "Int"
        },
        {
          "name": "firstAttemptAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "lastAttemptAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime"
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime"
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "serviceDate",
          "userId",
          "mode",
          "channelKey",
          "revision"
        ],
        [
          "retryKey"
        ]
      ],
      "foreignKeys": [
        {
          "table": "UserProfile",
          "fields": [
            "userId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "NO ACTION",
          "onDelete": "RESTRICT"
        },
        {
          "table": "StaffDailyDigest",
          "fields": [
            "sourceId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "NO ACTION",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "StaffLineBinding": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "channelKey",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "userId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "lineUserId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "displayName",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "linkedAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "unlinkedAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "sourceEventAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime"
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "channelKey",
          "lineUserId"
        ],
        [
          "channelKey",
          "userId"
        ]
      ],
      "foreignKeys": [
        {
          "table": "UserProfile",
          "fields": [
            "userId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "NO ACTION",
          "onDelete": "CASCADE"
        }
      ]
    },
    "StaffLineEvent": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "channelKey",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "payloadHash",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "outcome",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime"
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": []
    },
    "StaffLineRequest": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "channelKey",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "sourceEventId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "lineUserId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "displayName",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "tokenHash",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "sealedTicket",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "userId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "webSessionId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "nonceHash",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "expiresAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime"
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime"
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "channelKey",
          "sourceEventId"
        ],
        [
          "nonceHash"
        ]
      ],
      "foreignKeys": [
        {
          "table": "UserProfile",
          "fields": [
            "userId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "NO ACTION",
          "onDelete": "CASCADE"
        }
      ]
    },
    "StockBalance": {
      "relations": {
        "lot": "StockLot",
        "location": "StockLocation"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "lotId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "locationId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "condition",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "quantity",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "lotId",
          "locationId",
          "condition"
        ]
      ],
      "foreignKeys": [
        {
          "table": "StockLocation",
          "fields": [
            "locationId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "StockLot",
          "fields": [
            "lotId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "StockIssue": {
      "relations": {
        "lot": "StockLot",
        "source": "StockLocation",
        "destination": "StockLocation",
        "bookingLine": "BookingComponent"
      },
      "columns": [
        {
          "name": "runId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "lotId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "bookingLineId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "sourceId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "destinationId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "custodian",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "quantity",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "settledQty",
          "type": "INTEGER",
          "required": true,
          "default": "0",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": [
        {
          "table": "BookingComponent",
          "fields": [
            "bookingLineId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "StockLocation",
          "fields": [
            "destinationId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "StockLocation",
          "fields": [
            "sourceId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "StockLot",
          "fields": [
            "lotId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "StockLocation": {
      "relations": {
        "balances": "StockBalance",
        "issuedFrom": "StockIssue",
        "issuedTo": "StockIssue",
        "sources": "BookingComponent"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "kind",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "notes",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "code"
        ]
      ],
      "foreignKeys": []
    },
    "StockLot": {
      "relations": {
        "resource": "OperationResource",
        "balances": "StockBalance",
        "issues": "StockIssue"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "resourceId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "label",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "receivedOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "expiresOn",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": [
        {
          "table": "OperationResource",
          "fields": [
            "resourceId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "StockMovement": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "requestHash",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Char",
          "nativeArgs": [
            64
          ]
        },
        {
          "name": "kind",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "quantity",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "enteredQuantity",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "enteredUnit",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "factor",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "details",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "actorId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": []
    },
    "TourBooking": {
      "relations": {
        "attendance": "BookingAttendance",
        "guideAssignments": "GuideAssignment",
        "customerRequest": "CustomerRequest",
        "billLine": "AgentBillLine",
        "agent": "BusinessPartner",
        "trip": "OperationTrip",
        "lines": "BookingComponent"
      },
      "columns": [
        {
          "name": "assigneeId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "commissionSnapshot",
          "type": "JSONB",
          "required": false,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "outboundDate",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "returnDate",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "returnStatus",
          "type": "TEXT",
          "required": true,
          "default": "'OUR'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "createdById",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "hotelId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "channelId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "allergyStatus",
          "type": "TEXT",
          "required": true,
          "default": "'UNKNOWN'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "specialRequirements",
          "type": "JSONB",
          "required": true,
          "default": "[]",
          "kind": "String[]"
        },
        {
          "name": "agentId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "agentName",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "agentPhone",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            32
          ]
        },
        {
          "name": "agentReference",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "contactPhone",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            32
          ]
        },
        {
          "name": "hotel",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "room",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "pickupPoint",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "dropoffPoint",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "allergies",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "assistance",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "requestNotes",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "paymentTerms",
          "type": "TEXT",
          "required": true,
          "default": "'UNSET'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "afterServiceReason",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "tripId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "adults",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "children",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'DRAFT'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "adultPrice",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "childPrice",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "programSnapshot",
          "type": "JSONB",
          "required": true,
          "default": null,
          "kind": "Json"
        },
        {
          "name": "requestHash",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Char",
          "nativeArgs": [
            64
          ]
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "code"
        ]
      ],
      "foreignKeys": [
        {
          "table": "OperationTrip",
          "fields": [
            "tripId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "BusinessPartner",
          "fields": [
            "agentId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "TourFaq": {
      "relations": {
        "tour": "TourProgram"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "tourId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "sortOrder",
          "type": "INTEGER",
          "required": true,
          "default": "0",
          "kind": "Int"
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'ACTIVE'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "questionTh",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            500
          ]
        },
        {
          "name": "answerTh",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            5000
          ]
        },
        {
          "name": "questionEn",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            500
          ]
        },
        {
          "name": "answerEn",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            5000
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": [
        {
          "table": "TourProgram",
          "fields": [
            "tourId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "TourHighlight": {
      "relations": {
        "tour": "TourProgram"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "tourId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "sortOrder",
          "type": "INTEGER",
          "required": true,
          "default": "0",
          "kind": "Int"
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'ACTIVE'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "titleTh",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            300
          ]
        },
        {
          "name": "titleEn",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            300
          ]
        },
        {
          "name": "descriptionTh",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "descriptionEn",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": [
        {
          "table": "TourProgram",
          "fields": [
            "tourId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "TourItineraryStep": {
      "relations": {
        "tour": "TourProgram"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "tourId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "day",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "sortOrder",
          "type": "INTEGER",
          "required": true,
          "default": "0",
          "kind": "Int"
        },
        {
          "name": "timeLabel",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'ACTIVE'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "titleTh",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            300
          ]
        },
        {
          "name": "titleEn",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            300
          ]
        },
        {
          "name": "descriptionTh",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "descriptionEn",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "locationTh",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            300
          ]
        },
        {
          "name": "locationEn",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            300
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": [
        {
          "table": "TourProgram",
          "fields": [
            "tourId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "TourMedia": {
      "relations": {
        "tour": "TourProgram"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "tourId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "sortOrder",
          "type": "INTEGER",
          "required": true,
          "default": "0",
          "kind": "Int"
        },
        {
          "name": "kind",
          "type": "TEXT",
          "required": true,
          "default": "'GALLERY'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'ACTIVE'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "url",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2048
          ]
        },
        {
          "name": "altTh",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            300
          ]
        },
        {
          "name": "altEn",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            300
          ]
        },
        {
          "name": "captionTh",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            500
          ]
        },
        {
          "name": "captionEn",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            500
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": [
        {
          "table": "TourProgram",
          "fields": [
            "tourId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "TourProgram": {
      "relations": {
        "seasons": "TourSeason",
        "promotions": "TourPromotion",
        "customerRequests": "CustomerRequest",
        "publicContent": "TourProgramContent",
        "publicHighlights": "TourHighlight",
        "itinerarySteps": "TourItineraryStep",
        "publicFaqs": "TourFaq",
        "publicMedia": "TourMedia",
        "operator": "BusinessPartner",
        "components": "ProgramComponent",
        "trips": "OperationTrip",
        "agentPrices": "AgentTourPrice"
      },
      "columns": [
        {
          "name": "printCode",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            10
          ]
        },
        {
          "name": "bookingCommissionEligible",
          "type": "BOOLEAN",
          "required": true,
          "default": "false",
          "kind": "Boolean"
        },
        {
          "name": "bookingAdultCommission",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "bookingChildCommission",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "publicStatus",
          "type": "TEXT",
          "required": true,
          "default": "'DRAFT'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "homeFeatured",
          "type": "BOOLEAN",
          "required": true,
          "default": "false",
          "kind": "Boolean"
        },
        {
          "name": "homeFeaturedOrder",
          "type": "INTEGER",
          "required": false,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "homeBadge",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "slug",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "tourType",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "description",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            5000
          ]
        },
        {
          "name": "highlights",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            3000
          ]
        },
        {
          "name": "imageUrls",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            5000
          ]
        },
        {
          "name": "meals",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "fees",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "inclusions",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "exclusions",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "preparationNotes",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "partnerSourceUrl",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2048
          ]
        },
        {
          "name": "partnerTermsVerifiedAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "partnerContentVerifiedAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "journeyMode",
          "type": "TEXT",
          "required": true,
          "default": "'FIXED'",
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "durationDays",
          "type": "INTEGER",
          "required": false,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "ownership",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "operatorId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "route",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "departureTimes",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            300
          ]
        },
        {
          "name": "childPolicy",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "confirmationMode",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "cancellationTerms",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "bookingCutoff",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            300
          ]
        },
        {
          "name": "adultPrice",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "childPrice",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "supplierPricing",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "supplierAdultNet",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "supplierChildNet",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "supplierAdultCommission",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "supplierChildCommission",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "code"
        ],
        [
          "slug"
        ]
      ],
      "foreignKeys": [
        {
          "table": "BusinessPartner",
          "fields": [
            "operatorId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "TourProgramContent": {
      "relations": {
        "tour": "TourProgram"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "tourId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "locale",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            5
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "summary",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "introduction",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            5000
          ]
        },
        {
          "name": "longDescription",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20000
          ]
        },
        {
          "name": "departureTimes",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "childPolicy",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "cancellationTerms",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            3000
          ]
        },
        {
          "name": "bookingCutoff",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "meals",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            3000
          ]
        },
        {
          "name": "fees",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            3000
          ]
        },
        {
          "name": "inclusions",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            4000
          ]
        },
        {
          "name": "exclusions",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            4000
          ]
        },
        {
          "name": "preparationNotes",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            4000
          ]
        },
        {
          "name": "specialConditions",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            5000
          ]
        },
        {
          "name": "suitableFor",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1500
          ]
        },
        {
          "name": "meetingPoint",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "weatherNotes",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        },
        {
          "name": "seoTitle",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            120
          ]
        },
        {
          "name": "metaDescription",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            320
          ]
        },
        {
          "name": "ogTitle",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            120
          ]
        },
        {
          "name": "ogDescription",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            320
          ]
        },
        {
          "name": "contentReviewedAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "tourId",
          "locale"
        ]
      ],
      "foreignKeys": [
        {
          "table": "TourProgram",
          "fields": [
            "tourId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "TourPromotion": {
      "relations": {
        "requests": "CustomerRequest",
        "tour": "TourProgram"
      },
      "columns": [
        {
          "name": "holdHours",
          "type": "INTEGER",
          "required": false,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "tourId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "startsOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "endsOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "serviceStartsOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "serviceEndsOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "adultPrice",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "childPrice",
          "type": "DECIMAL",
          "required": false,
          "default": null,
          "kind": "Decimal",
          "native": "Decimal",
          "nativeArgs": [
            10,
            2
          ]
        },
        {
          "name": "quota",
          "type": "INTEGER",
          "required": false,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "quotaUnit",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "terms",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "code"
        ]
      ],
      "foreignKeys": [
        {
          "table": "TourProgram",
          "fields": [
            "tourId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "TourSeason": {
      "relations": {
        "tour": "TourProgram"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "tourId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "startsOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "endsOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "onlineStartsOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "onlineEndsOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "bookingStartsOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "bookingEndsOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "cutoffDays",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "closedDates",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2000
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "code"
        ]
      ],
      "foreignKeys": [
        {
          "table": "TourProgram",
          "fields": [
            "tourId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        }
      ]
    },
    "UserPermissionOverride": {
      "relations": {
        "user": "UserProfile"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "userId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "permissionCode",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "effect",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            10
          ]
        },
        {
          "name": "scopeId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "startsAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "expiresAt",
          "type": "DATETIME",
          "required": false,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": [
        {
          "table": "UserProfile",
          "fields": [
            "userId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "CASCADE"
        }
      ]
    },
    "UserProfile": {
      "relations": {
        "roles": "UserRole",
        "permissionOverrides": "UserPermissionOverride",
        "dispatchStaff": "DispatchStaff",
        "guideAssignments": "GuideAssignment"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "displayName",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "nickname",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "department",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "address",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            1000
          ]
        },
        {
          "name": "primaryPhone",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            32
          ]
        },
        {
          "name": "emergencyPhone",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            32
          ]
        },
        {
          "name": "lineId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": "'ACTIVE'",
          "kind": "AccountStatus",
          "enum": [
            "ACTIVE",
            "SUSPENDED",
            "DEACTIVATED"
          ]
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "accessVersion",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "province",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "district",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "subdistrict",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "postalCode",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            5
          ]
        },
        {
          "name": "houseNumber",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "moo",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "villageName",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            150
          ]
        },
        {
          "name": "mapUrl",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2048
          ]
        },
        {
          "name": "latitude",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "longitude",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            30
          ]
        },
        {
          "name": "firstName",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "lastName",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ]
      ],
      "foreignKeys": []
    },
    "UserRole": {
      "relations": {
        "user": "UserProfile",
        "role": "Role"
      },
      "columns": [
        {
          "name": "userId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "roleCode",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            50
          ]
        },
        {
          "name": "scope",
          "type": "TEXT",
          "required": true,
          "default": "'SELF'",
          "kind": "AccessScope",
          "enum": [
            "SELF",
            "COMPANY"
          ]
        }
      ],
      "pk": [
        "userId",
        "roleCode",
        "scope"
      ],
      "unique": [
        [
          "userId",
          "roleCode",
          "scope"
        ]
      ],
      "foreignKeys": [
        {
          "table": "Role",
          "fields": [
            "roleCode"
          ],
          "references": [
            "code"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "RESTRICT"
        },
        {
          "table": "UserProfile",
          "fields": [
            "userId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "CASCADE"
        }
      ]
    },
    "WarehouseResponsibility": {
      "relations": {},
      "columns": [
        {
          "name": "storeId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "primaryUserId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "deputyUserIds",
          "type": "JSONB",
          "required": true,
          "default": "[]",
          "kind": "String[]",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "reason",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "updatedById",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        }
      ],
      "pk": [
        "storeId"
      ],
      "unique": [
        [
          "storeId"
        ]
      ],
      "foreignKeys": []
    },
    "WebSession": {
      "relations": {
        "user": "AuthUser",
        "authSession": "AuthSession",
        "verification": "AuthVerification"
      },
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "userId",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "authSessionId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "verificationId",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String"
        },
        {
          "name": "purpose",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String"
        },
        {
          "name": "expiresAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime"
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "verificationId"
        ]
      ],
      "foreignKeys": [
        {
          "table": "AuthVerification",
          "fields": [
            "verificationId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "CASCADE"
        },
        {
          "table": "AuthSession",
          "fields": [
            "authSessionId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "CASCADE"
        },
        {
          "table": "AuthUser",
          "fields": [
            "userId"
          ],
          "references": [
            "id"
          ],
          "onUpdate": "CASCADE",
          "onDelete": "CASCADE"
        }
      ]
    },
    "WebsiteImage": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "filename",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "mimeType",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "objectKey",
          "type": "TEXT",
          "required": true,
          "default": null
        },
        {
          "name": "size",
          "type": "INTEGER",
          "required": true,
          "default": null,
          "kind": "Int"
        },
        {
          "name": "sha256",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            64
          ]
        },
        {
          "name": "uploadedBy",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "objectKey"
        ]
      ],
      "foreignKeys": []
    },
    "WebsitePopup": {
      "relations": {},
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "Uuid",
          "nativeArgs": []
        },
        {
          "name": "version",
          "type": "INTEGER",
          "required": true,
          "default": "1",
          "kind": "Int"
        },
        {
          "name": "createdAt",
          "type": "DATETIME",
          "required": true,
          "default": "CURRENT_TIMESTAMP",
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "updatedAt",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Timestamptz",
          "nativeArgs": [
            6
          ]
        },
        {
          "name": "code",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            40
          ]
        },
        {
          "name": "name",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "status",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "imageUrl",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2048
          ]
        },
        {
          "name": "imageAlt",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            300
          ]
        },
        {
          "name": "mobileImageUrl",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2048
          ]
        },
        {
          "name": "title",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            200
          ]
        },
        {
          "name": "linkUrl",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            2048
          ]
        },
        {
          "name": "buttonLabel",
          "type": "TEXT",
          "required": false,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            100
          ]
        },
        {
          "name": "startsOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "endsOn",
          "type": "DATETIME",
          "required": true,
          "default": null,
          "kind": "DateTime",
          "native": "Date",
          "nativeArgs": []
        },
        {
          "name": "frequency",
          "type": "TEXT",
          "required": true,
          "default": null,
          "kind": "String",
          "native": "VarChar",
          "nativeArgs": [
            20
          ]
        },
        {
          "name": "priority",
          "type": "INTEGER",
          "required": true,
          "default": "0",
          "kind": "Int"
        }
      ],
      "pk": [
        "id"
      ],
      "unique": [
        [
          "id"
        ],
        [
          "code"
        ]
      ],
      "foreignKeys": []
    }
  }
}
