"""Database-level append-only guard for audit_auditevent.

The model refuses updates/deletes, but raw SQL, the ``unscoped`` manager or a
future code path could bypass it. These triggers reject UPDATE and DELETE in
the database itself (PostgreSQL in production, SQLite in tests).
"""
from django.db import migrations

TABLE = "audit_auditevent"

PG_UP = f"""
CREATE OR REPLACE FUNCTION audit_event_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit events are append-only (% blocked)', TG_OP;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER audit_event_no_update BEFORE UPDATE ON {TABLE}
  FOR EACH ROW EXECUTE FUNCTION audit_event_append_only();
CREATE TRIGGER audit_event_no_delete BEFORE DELETE ON {TABLE}
  FOR EACH ROW EXECUTE FUNCTION audit_event_append_only();
"""
PG_DOWN = f"""
DROP TRIGGER IF EXISTS audit_event_no_update ON {TABLE};
DROP TRIGGER IF EXISTS audit_event_no_delete ON {TABLE};
DROP FUNCTION IF EXISTS audit_event_append_only();
"""
SQLITE_UP = [
    f"CREATE TRIGGER audit_event_no_update BEFORE UPDATE ON {TABLE} "
    "BEGIN SELECT RAISE(ABORT, 'audit events are append-only (UPDATE blocked)'); END;",
    f"CREATE TRIGGER audit_event_no_delete BEFORE DELETE ON {TABLE} "
    "BEGIN SELECT RAISE(ABORT, 'audit events are append-only (DELETE blocked)'); END;",
]
SQLITE_DOWN = [
    "DROP TRIGGER IF EXISTS audit_event_no_update;",
    "DROP TRIGGER IF EXISTS audit_event_no_delete;",
]


def _run(statements_by_vendor):
    def apply(apps, schema_editor):
        stmts = statements_by_vendor.get(schema_editor.connection.vendor)
        if stmts is None:
            raise RuntimeError(f"No append-only trigger for {schema_editor.connection.vendor}")
        for sql in [stmts] if isinstance(stmts, str) else stmts:
            schema_editor.execute(sql)

    return apply


class Migration(migrations.Migration):
    dependencies = [("audit", "0002_audit_event")]

    operations = [
        migrations.RunPython(
            _run({"postgresql": PG_UP, "sqlite": SQLITE_UP}),
            _run({"postgresql": PG_DOWN, "sqlite": SQLITE_DOWN}),
        ),
    ]
