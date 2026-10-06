PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'Active',
    ip_address TEXT,
    last_communication TEXT,
    event_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL,
    source_ip TEXT,
    username TEXT,
    severity TEXT,
    description TEXT,
    windows_event_id INTEGER,
    windows_record_id INTEGER,
    FOREIGN KEY (agent_id)
        REFERENCES agents(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS detection_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    severity TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER NOT NULL,
    agent_id INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    description TEXT,
    FOREIGN KEY (rule_id)
        REFERENCES detection_rules(id),
    FOREIGN KEY (agent_id)
        REFERENCES agents(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alert_events (
    alert_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    PRIMARY KEY (alert_id, event_id),
    FOREIGN KEY (alert_id)
        REFERENCES alerts(id)
        ON DELETE CASCADE,
    FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    agent_id INTEGER NOT NULL,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (agent_id)
        REFERENCES agents(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS incident_alerts (
    incident_id INTEGER NOT NULL,
    alert_id INTEGER NOT NULL,
    PRIMARY KEY (incident_id, alert_id),
    FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE
);