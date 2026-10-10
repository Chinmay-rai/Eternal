import sqlite3
from pathlib import Path
from datetime import datetime, timedelta

try:
    from .rules import RULES
except ImportError:
    from rules import RULES


PROJECT_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = PROJECT_DIR / "Database" / "eternal.db"

ACTIVE_INCIDENT_STATUSES = ("Open", "Investigating")

SEVERITY_RANK = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}


# --------------------------------------------------
# Timestamp handling
# --------------------------------------------------

def parse_timestamp(value):
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def comparable_datetime(value):
    if value is None:
        return None

    if value.tzinfo is not None:
        return value.astimezone().replace(tzinfo=None)

    return value


# --------------------------------------------------
# Database migration
# --------------------------------------------------

def ensure_incident_schema(connection):
    cursor = connection.cursor()
    cursor.execute("PRAGMA table_info(incidents)")
    columns = {row[1] for row in cursor.fetchall()}

    if not columns:
        raise RuntimeError(
            "The incidents table is missing. Initialize the database first."
        )

    if "incident_key" not in columns:
        cursor.execute(
            "ALTER TABLE incidents ADD COLUMN incident_key TEXT"
        )

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_incidents_agent_key_status
        ON incidents (agent_id, incident_key, status)
    """)

    connection.commit()


# --------------------------------------------------
# Register rules
# --------------------------------------------------

def register_rules(connection):
    cursor = connection.cursor()

    for rule in RULES:
        cursor.execute("""
            INSERT INTO detection_rules (
                name, description, severity, enabled
            )
            VALUES (?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                description = excluded.description,
                severity = excluded.severity,
                enabled = excluded.enabled
        """, (
            rule["name"],
            rule["description"],
            rule["severity"],
            int(rule.get("enabled", True)),
        ))

    connection.commit()

    cursor.execute("SELECT id, name FROM detection_rules")
    return {row["name"]: row["id"] for row in cursor.fetchall()}


# --------------------------------------------------
# Load events
# --------------------------------------------------

def get_events(connection):
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            id, agent_id, timestamp, event_type, source_ip,
            username, severity, description
        FROM events
        ORDER BY timestamp ASC, id ASC
    """)

    events = [dict(row) for row in cursor.fetchall()]

    for event in events:
        event["_datetime"] = parse_timestamp(event["timestamp"])

    return [
        event for event in events
        if event["_datetime"] is not None
    ]


# --------------------------------------------------
# Prevent duplicate alerts
# --------------------------------------------------

def alert_already_exists(connection, rule_id, event_ids):
    if not event_ids:
        return False

    placeholders = ",".join("?" for _ in event_ids)
    cursor = connection.cursor()

    cursor.execute(f"""
        SELECT 1
        FROM alerts AS a
        JOIN alert_events AS ae ON ae.alert_id = a.id
        WHERE a.rule_id = ?
          AND ae.event_id IN ({placeholders})
        LIMIT 1
    """, (rule_id, *event_ids))

    return cursor.fetchone() is not None


# --------------------------------------------------
# Incident grouping
# --------------------------------------------------

def incident_group_key(rule, triggering_events):
    pattern = rule.get("incident_key")

    if not pattern or not triggering_events:
        return None

    latest_event = max(
        triggering_events,
        key=lambda event: comparable_datetime(event["_datetime"]),
    )

    if pattern == "brute_force":
        identity = latest_event.get("source_ip")
        identity_name = "source_ip"
    else:
        identity = latest_event.get("username")
        identity_name = "username"

    if not identity or identity == "-":
        identity = f"event:{latest_event['id']}"

    return f"{pattern}|{identity_name}={identity}"


def highest_severity(current, incoming):
    current_rank = SEVERITY_RANK.get((current or "").lower(), 0)
    incoming_rank = SEVERITY_RANK.get((incoming or "").lower(), 0)

    return incoming if incoming_rank > current_rank else current


def create_or_update_incident(
    connection,
    rule,
    alert_id,
    triggering_events,
):
    group_key = incident_group_key(rule, triggering_events)

    if not group_key:
        return None

    latest_event = max(
        triggering_events,
        key=lambda event: comparable_datetime(event["_datetime"]),
    )
    earliest_event = min(
        triggering_events,
        key=lambda event: comparable_datetime(event["_datetime"]),
    )

    agent_id = latest_event["agent_id"]
    incident_name = rule.get("incident_name", rule["name"])
    incoming_severity = rule["severity"]

    description = (
        f"{incident_name}. Latest related alert: {rule['name']}. "
        f"{latest_event.get('description') or rule['description']}"
    )

    cursor = connection.cursor()
    placeholders = ",".join("?" for _ in ACTIVE_INCIDENT_STATUSES)

    cursor.execute(f"""
        SELECT id, severity, first_seen, last_seen, description
        FROM incidents
        WHERE agent_id = ?
          AND incident_key = ?
          AND status IN ({placeholders})
        ORDER BY id DESC
        LIMIT 1
    """, (agent_id, group_key, *ACTIVE_INCIDENT_STATUSES))

    incident = cursor.fetchone()

    if incident:
        incident_id = incident["id"]

        old_first = comparable_datetime(
            parse_timestamp(incident["first_seen"])
        )
        old_last = comparable_datetime(
            parse_timestamp(incident["last_seen"])
        )
        new_first = comparable_datetime(earliest_event["_datetime"])
        new_last = comparable_datetime(latest_event["_datetime"])

        first_seen = (
            min(old_first, new_first).isoformat(sep=" ")
            if old_first and new_first
            else earliest_event["timestamp"]
        )
        last_seen = (
            max(old_last, new_last).isoformat(sep=" ")
            if old_last and new_last
            else latest_event["timestamp"]
        )

        severity = highest_severity(
            incident["severity"],
            incoming_severity,
        )

        combined_description = incident["description"] or description
        if description not in combined_description:
            combined_description += f"\n{description}"

        cursor.execute("""
            UPDATE incidents
            SET name = ?, severity = ?, first_seen = ?,
                last_seen = ?, description = ?
            WHERE id = ?
        """, (
            incident_name,
            severity,
            first_seen,
            last_seen,
            combined_description,
            incident_id,
        ))

    else:
        cursor.execute("""
            INSERT INTO incidents (
                name, severity, status, agent_id, first_seen,
                last_seen, description, incident_key
            )
            VALUES (?, ?, 'Open', ?, ?, ?, ?, ?)
        """, (
            incident_name,
            incoming_severity,
            agent_id,
            earliest_event["timestamp"],
            latest_event["timestamp"],
            description,
            group_key,
        ))

        incident_id = cursor.lastrowid

        print(
            f"INCIDENT CREATED: {incident_name} "
            f"(ID: {incident_id}, Agent ID: {agent_id})"
        )

    cursor.execute("""
        INSERT OR IGNORE INTO incident_alerts (incident_id, alert_id)
        VALUES (?, ?)
    """, (incident_id, alert_id))

    return incident_id


# --------------------------------------------------
# Synchronize existing qualifying alerts
# --------------------------------------------------

def sync_existing_alerts(connection):
    """
    Create or update incidents for existing alerts belonging to rules
    that have incident metadata. Unrelated rules are ignored.
    """
    rules_by_name = {
        rule["name"]: rule
        for rule in RULES
        if rule.get("incident_key")
    }

    cursor = connection.cursor()
    incidents_processed = 0

    for rule_name, rule in rules_by_name.items():
        cursor.execute("""
            SELECT al.id, al.agent_id, al.timestamp, al.severity,
                   al.description
            FROM alerts al
            JOIN detection_rules dr ON dr.id = al.rule_id
            WHERE dr.name = ?
            ORDER BY al.id
        """, (rule_name,))

        alert_rows = cursor.fetchall()

        for alert_row in alert_rows:
            alert_id = alert_row["id"]

            # If already linked, don't process it again.
            cursor.execute("""
                SELECT 1
                FROM incident_alerts
                WHERE alert_id = ?
                LIMIT 1
            """, (alert_id,))

            if cursor.fetchone():
                continue

            cursor.execute("""
                SELECT
                    e.id, e.agent_id, e.timestamp, e.event_type,
                    e.source_ip, e.username, e.severity, e.description
                FROM alert_events ae
                JOIN events e ON e.id = ae.event_id
                WHERE ae.alert_id = ?
                ORDER BY e.timestamp, e.id
            """, (alert_id,))

            triggering_events = [
                dict(row) for row in cursor.fetchall()
            ]

            for event in triggering_events:
                event["_datetime"] = parse_timestamp(event["timestamp"])

            triggering_events = [
                event for event in triggering_events
                if event["_datetime"] is not None
            ]

            if not triggering_events:
                continue

            create_or_update_incident(
                connection,
                rule,
                alert_id,
                triggering_events,
            )

            incidents_processed += 1

    print(
        f"Existing qualifying alerts processed: {incidents_processed}"
    )
    return incidents_processed


# --------------------------------------------------
# Create alert
# --------------------------------------------------

def create_alert(
    connection,
    rule,
    rule_id,
    triggering_events,
    description=None,
):
    event_ids = sorted({
        event["id"] for event in triggering_events
    })

    if not event_ids:
        return False

    if alert_already_exists(connection, rule_id, event_ids):
        return False

    latest_event = max(
        triggering_events,
        key=lambda event: comparable_datetime(event["_datetime"]),
    )

    alert_description = description or rule["description"]
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO alerts (
            rule_id, agent_id, timestamp, alert_type, severity,
            status, description
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        rule_id,
        latest_event["agent_id"],
        latest_event["timestamp"],
        rule["name"],
        rule["severity"],
        "New",
        alert_description,
    ))

    alert_id = cursor.lastrowid

    cursor.executemany("""
        INSERT INTO alert_events (alert_id, event_id)
        VALUES (?, ?)
    """, [
        (alert_id, event_id)
        for event_id in event_ids
    ])

    create_or_update_incident(
        connection,
        rule,
        alert_id,
        triggering_events,
    )

    print(
        f"ALERT CREATED: {rule['name']} "
        f"(ID: {alert_id}, Severity: {rule['severity']})"
    )

    return True


# --------------------------------------------------
# Single-event detection
# --------------------------------------------------

def evaluate_single_event(connection, rule, rule_id, events):
    alerts_created = 0

    for event in events:
        if event["event_type"] != rule["event_type"]:
            continue

        description = (
            f"{rule['description']} "
            f"Username: {event['username'] or 'Unknown'}. "
            f"Source IP: {event['source_ip'] or 'Unknown'}."
        )

        if create_alert(
            connection, rule, rule_id, [event], description
        ):
            alerts_created += 1

    return alerts_created


# --------------------------------------------------
# Repeated failed logins
# --------------------------------------------------

def evaluate_threshold(connection, rule, rule_id, events):
    alerts_created = 0
    threshold = rule["threshold"]
    window = timedelta(seconds=rule["window_seconds"])

    for current_event in events:
        if current_event["event_type"] != rule["event_type"]:
            continue

        source_ip = current_event["source_ip"]

        if not source_ip or source_ip == "-":
            continue

        current_time = comparable_datetime(current_event["_datetime"])
        window_start = current_time - window

        matching_events = [
            event for event in events
            if (
                event["agent_id"] == current_event["agent_id"]
                and event["event_type"] == rule["event_type"]
                and event["source_ip"] == source_ip
                and window_start
                <= comparable_datetime(event["_datetime"])
                <= current_time
            )
        ]

        if len(matching_events) < threshold:
            continue

        description = (
            f"{rule['description']} Source IP: {source_ip}. "
            f"Failed attempts: {len(matching_events)}."
        )

        if create_alert(
            connection, rule, rule_id, matching_events, description
        ):
            alerts_created += 1

    return alerts_created


# --------------------------------------------------
# Failed logins followed by successful login
# --------------------------------------------------

def evaluate_sequence(connection, rule, rule_id, events):
    alerts_created = 0
    window = timedelta(seconds=rule["window_seconds"])
    threshold = rule["first_event_threshold"]

    for successful_event in events:
        if successful_event["event_type"] != rule["second_event_type"]:
            continue

        username = successful_event["username"]

        if not username or username == "-":
            continue

        success_time = comparable_datetime(successful_event["_datetime"])
        window_start = success_time - window

        failed_events = [
            event for event in events
            if (
                event["agent_id"] == successful_event["agent_id"]
                and event["event_type"] == rule["first_event_type"]
                and event["username"] == username
                and window_start
                <= comparable_datetime(event["_datetime"])
                < success_time
            )
        ]

        if len(failed_events) < threshold:
            continue

        triggering_events = failed_events + [successful_event]

        description = (
            f"{rule['description']} Username: {username}. "
            f"Failed attempts before success: {len(failed_events)}."
        )

        if create_alert(
            connection, rule, rule_id,
            triggering_events, description
        ):
            alerts_created += 1

    return alerts_created


# --------------------------------------------------
# Main detection function
# --------------------------------------------------

def run_detection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    alerts_created = 0

    try:
        ensure_incident_schema(connection)
        rule_ids = register_rules(connection)

        # Backfill incidents for existing qualifying alerts first.
        sync_existing_alerts(connection)

        events = get_events(connection)

        for rule in RULES:
            if not rule.get("enabled", True):
                continue

            rule_id = rule_ids[rule["name"]]
            detection_type = rule["detection_type"]

            if detection_type == "single_event":
                alerts_created += evaluate_single_event(
                    connection, rule, rule_id, events
                )

            elif detection_type == "threshold":
                alerts_created += evaluate_threshold(
                    connection, rule, rule_id, events
                )

            elif detection_type == "sequence":
                alerts_created += evaluate_sequence(
                    connection, rule, rule_id, events
                )

        connection.commit()

        print(
            f"Detection completed. New alerts created: {alerts_created}"
        )

        return alerts_created

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


if __name__ == "__main__":
    run_detection()