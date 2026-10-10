import sqlite3
from pathlib import Path
from datetime import datetime, timedelta
import ipaddress
import socket
import subprocess
from concurrent.futures import ThreadPoolExecutor

from flask import Flask, jsonify, send_from_directory, request


PROJECT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"
DATABASE_PATH = PROJECT_DIR / "Database" / "eternal.db"

app = Flask(
    __name__,
    static_folder=str(FRONTEND_DIR),
    static_url_path=""
)


# --------------------------------------------------
# Database Connection
# --------------------------------------------------

def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


# --------------------------------------------------
# Frontend Routes
# --------------------------------------------------

@app.route("/")
def dashboard():
    return send_from_directory(FRONTEND_DIR / "html", "index.html")


@app.route("/<page>")
def frontend_page(page):
    pages = {
        "events": "events.html",
        "alerts": "alerts.html",
        "agents": "agents.html",
        "incidents": "incidents.html",
        "network": "network.html",
        "settings": "settings.html",
        "loading": "loading.html",
    }

    if page not in pages:
        return jsonify({"error": "Page not found"}), 404

    return send_from_directory(FRONTEND_DIR / "html", pages[page])


# --------------------------------------------------
# Global Search API
# --------------------------------------------------

@app.route("/api/search", methods=["GET"])
def global_search():
    query = request.args.get("q", "").strip()

    if len(query) < 2:
        return jsonify({"results": []})

    # Limit query length and escape SQL LIKE wildcards.
    query = query[:100]
    escaped_query = (
        query.replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_")
    )
    pattern = f"%{escaped_query}%"

    connection = get_connection()

    try:
        results = []

        # Agents
        rows = connection.execute(
            """
            SELECT
                a.id,
                a.name,
                a.status,
                a.ip_address
            FROM agents a
            WHERE
                a.name LIKE ? ESCAPE '\\'
                OR a.status LIKE ? ESCAPE '\\'
                OR a.ip_address LIKE ? ESCAPE '\\'
            ORDER BY a.name
            LIMIT 5
            """,
            (pattern, pattern, pattern)
        ).fetchall()

        for row in rows:
            results.append({
                "type": "agents",
                "title": row["name"] or f"Agent {row['id']}",
                "subtitle": (
                    f"IP: {row['ip_address'] or 'Unknown'}"
                    f" · Status: {row['status'] or 'Unknown'}"
                ),
                "url": "/agents"
            })

        # Events
        rows = connection.execute(
            """
            SELECT
                e.id,
                e.timestamp,
                e.event_type,
                e.source_ip,
                e.username,
                e.severity,
                e.description,
                a.name AS agent_name
            FROM events e
            LEFT JOIN agents a ON a.id = e.agent_id
            WHERE
                e.event_type LIKE ? ESCAPE '\\'
                OR e.source_ip LIKE ? ESCAPE '\\'
                OR e.username LIKE ? ESCAPE '\\'
                OR e.severity LIKE ? ESCAPE '\\'
                OR e.description LIKE ? ESCAPE '\\'
                OR a.name LIKE ? ESCAPE '\\'
            ORDER BY e.id DESC
            LIMIT 5
            """,
            (pattern,) * 6
        ).fetchall()

        for row in rows:
            results.append({
                "type": "events",
                "title": row["event_type"] or f"Event {row['id']}",
                "subtitle": (
                    f"Source: {row['source_ip'] or 'Unknown'}"
                    f" · Agent: {row['agent_name'] or 'Unknown'}"
                    f" · Severity: {row['severity'] or 'Unknown'}"
                ),
                "url": "/events"
            })

        # Alerts
        rows = connection.execute(
            """
            SELECT
                al.id,
                al.alert_type,
                al.severity,
                al.status,
                al.description,
                a.name AS agent_name,
                r.name AS rule_name
            FROM alerts al
            LEFT JOIN agents a ON a.id = al.agent_id
            LEFT JOIN detection_rules r ON r.id = al.rule_id
            WHERE
                al.alert_type LIKE ? ESCAPE '\\'
                OR al.severity LIKE ? ESCAPE '\\'
                OR al.status LIKE ? ESCAPE '\\'
                OR al.description LIKE ? ESCAPE '\\'
                OR a.name LIKE ? ESCAPE '\\'
                OR r.name LIKE ? ESCAPE '\\'
            ORDER BY al.id DESC
            LIMIT 5
            """,
            (pattern,) * 6
        ).fetchall()

        for row in rows:
            results.append({
                "type": "alerts",
                "title": row["alert_type"] or f"Alert {row['id']}",
                "subtitle": (
                    f"Severity: {row['severity'] or 'Unknown'}"
                    f" · Status: {row['status'] or 'Unknown'}"
                    f" · Agent: {row['agent_name'] or 'Unknown'}"
                ),
                "url": "/alerts"
            })

        # Incidents
        rows = connection.execute(
            """
            SELECT
                i.id,
                i.name,
                i.severity,
                i.status,
                i.description,
                a.name AS agent_name
            FROM incidents i
            LEFT JOIN agents a ON a.id = i.agent_id
            WHERE
                i.name LIKE ? ESCAPE '\\'
                OR i.severity LIKE ? ESCAPE '\\'
                OR i.status LIKE ? ESCAPE '\\'
                OR i.description LIKE ? ESCAPE '\\'
                OR a.name LIKE ? ESCAPE '\\'
            ORDER BY i.id DESC
            LIMIT 5
            """,
            (pattern,) * 5
        ).fetchall()

        for row in rows:
            results.append({
                "type": "incidents",
                "title": row["name"] or f"Incident {row['id']}",
                "subtitle": (
                    f"Severity: {row['severity'] or 'Unknown'}"
                    f" · Status: {row['status'] or 'Unknown'}"
                    f" · Agent: {row['agent_name'] or 'Unknown'}"
                ),
                "url": "/incidents"
            })

        return jsonify({"results": results})

    except sqlite3.Error:
        app.logger.exception("Global search failed")
        return jsonify({"error": "Search failed", "results": []}), 500

    finally:
        connection.close()


# --------------------------------------------------
# Events API
# --------------------------------------------------

@app.route("/api/events")
def get_events():
    connection = get_connection()

    try:
        rows = connection.execute(
            """
            SELECT
                e.id,
                e.timestamp,
                e.event_type,
                e.source_ip,
                e.username,
                e.severity,
                e.description,
                e.windows_event_id,
                e.windows_record_id,
                a.name AS agent
            FROM events e
            JOIN agents a ON a.id = e.agent_id
            ORDER BY e.id DESC
            """
        ).fetchall()

        return jsonify([dict(row) for row in rows])

    finally:
        connection.close()


# --------------------------------------------------
# Alerts API
# --------------------------------------------------

@app.route("/api/alerts")
def get_alerts():
    connection = get_connection()

    try:
        rows = connection.execute(
            """
            SELECT
                al.id,
                al.timestamp,
                al.alert_type,
                al.severity,
                al.status,
                al.description,
                a.name AS agent,
                r.name AS rule_name
            FROM alerts al
            JOIN agents a ON a.id = al.agent_id
            JOIN detection_rules r ON r.id = al.rule_id
            ORDER BY al.id DESC
            """
        ).fetchall()

        return jsonify([dict(row) for row in rows])

    finally:
        connection.close()


# --------------------------------------------------
# Agents API
# --------------------------------------------------

@app.route("/api/agents")
def get_agents():
    connection = get_connection()

    try:
        rows = connection.execute(
            """
            SELECT
                a.name,
                a.status,
                a.ip_address,
                a.last_communication,
                COUNT(e.id) AS event_count
            FROM agents a
            LEFT JOIN events e ON e.agent_id = a.id
            GROUP BY
                a.id,
                a.name,
                a.status,
                a.ip_address,
                a.last_communication
            ORDER BY a.name
            """
        ).fetchall()

        now = datetime.now()
        agents = []

        for row in rows:
            last_communication = row["last_communication"]
            status = "Offline"

            if last_communication:
                try:
                    last_seen = datetime.fromisoformat(
                        last_communication.strip().replace(
                            "Z", "+00:00"
                        )
                    )

                    if last_seen.tzinfo is not None:
                        last_seen = (
                            last_seen.astimezone().replace(tzinfo=None)
                        )

                    seconds_since_seen = (
                        now - last_seen
                    ).total_seconds()

                    if 0 <= seconds_since_seen <= 30:
                        status = "Active"

                except (ValueError, TypeError, AttributeError):
                    status = "Offline"

            agents.append({
                "name": row["name"],
                "status": status,
                "ip": row["ip_address"] or "—",
                "lastCommunication": last_communication,
                "events": row["event_count"]
            })

        return jsonify(agents)

    finally:
        connection.close()


# --------------------------------------------------
# Dashboard API
# --------------------------------------------------

@app.route("/api/dashboard")
def get_dashboard():
    selected_range = request.args.get("range", "24h")

    if selected_range not in ("24h", "7d", "30d"):
        selected_range = "24h"

    connection = get_connection()

    try:
        total_events = connection.execute(
            "SELECT COUNT(*) FROM events"
        ).fetchone()[0]

        active_agents = connection.execute(
            """
            SELECT COUNT(*) FROM agents
            WHERE LOWER(status) = 'active'
            """
        ).fetchone()[0]

        open_alerts = connection.execute(
            """
            SELECT COUNT(*) FROM alerts
            WHERE LOWER(status) != 'resolved'
            """
        ).fetchone()[0]

        critical_threats = connection.execute(
            """
            SELECT COUNT(*) FROM alerts
            WHERE LOWER(severity) = 'critical'
              AND LOWER(status) != 'resolved'
            """
        ).fetchone()[0]

        severity_rows = connection.execute(
            """
            SELECT
                LOWER(severity) AS severity,
                COUNT(*) AS total
            FROM alerts
            GROUP BY LOWER(severity)
            """
        ).fetchall()

        severity_counts = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0
        }

        for row in severity_rows:
            if row["severity"] in severity_counts:
                severity_counts[row["severity"]] = row["total"]

        recent_rows = connection.execute(
            """
            SELECT
                timestamp,
                event_type,
                source_ip,
                username,
                severity
            FROM events
            ORDER BY id DESC
            LIMIT 5
            """
        ).fetchall()

        recent_events = [dict(row) for row in recent_rows]

        # Prepare chart buckets using event timestamps.
        now = datetime.now()

        all_timestamps = connection.execute(
            "SELECT timestamp FROM events"
        ).fetchall()

        parsed_times = []

        for row in all_timestamps:
            try:
                raw_timestamp = row["timestamp"].strip()

                event_time = datetime.fromisoformat(
                    raw_timestamp.replace("Z", "+00:00")
                )

                if event_time.tzinfo is not None:
                    event_time = (
                        event_time.astimezone().replace(tzinfo=None)
                    )

                parsed_times.append(event_time)

            except (ValueError, TypeError, AttributeError):
                continue

        if selected_range == "24h":
            start = now - timedelta(hours=24)
            bucket_count = 6
            bucket_size = timedelta(hours=4)

            labels = [
                (start + bucket_size * i).strftime("%H:%M")
                for i in range(bucket_count)
            ]

        elif selected_range == "7d":
            start = now - timedelta(days=7)
            bucket_count = 7
            bucket_size = timedelta(days=1)

            labels = [
                (start + bucket_size * i).strftime("%a")
                for i in range(bucket_count)
            ]

        else:
            start = now - timedelta(days=30)
            bucket_count = 5
            bucket_size = timedelta(days=6)

            labels = [
                f"Week {i + 1}"
                for i in range(bucket_count)
            ]

        chart_data = [0] * bucket_count

        for event_time in parsed_times:
            elapsed = event_time - start

            if elapsed.total_seconds() < 0:
                continue

            bucket_index = int(
                elapsed.total_seconds()
                / bucket_size.total_seconds()
            )

            if 0 <= bucket_index < bucket_count:
                chart_data[bucket_index] += 1

        return jsonify({
            "total_events": total_events,
            "active_agents": active_agents,
            "open_alerts": open_alerts,
            "critical_threats": critical_threats,
            "severity_counts": severity_counts,
            "recent_events": recent_events,
            "events_chart": {
                "labels": labels,
                "data": chart_data
            }
        })

    finally:
        connection.close()


# --------------------------------------------------
# Incidents API
# --------------------------------------------------

@app.route("/api/incidents", methods=["GET"])
def get_incidents():
    connection = get_connection()

    try:
        rows = connection.execute(
            """
            SELECT
                i.id,
                i.name,
                i.severity,
                i.status,
                i.agent_id,
                a.name AS agent,
                i.first_seen,
                i.last_seen,
                i.description,
                COUNT(DISTINCT ia.alert_id) AS alert_count
            FROM incidents i
            JOIN agents a ON a.id = i.agent_id
            LEFT JOIN incident_alerts ia
                ON ia.incident_id = i.id
            GROUP BY i.id
            ORDER BY
                CASE LOWER(i.status)
                    WHEN 'open' THEN 1
                    WHEN 'investigating' THEN 2
                    ELSE 3
                END,
                i.last_seen DESC
            """
        ).fetchall()

        return jsonify([dict(row) for row in rows])

    finally:
        connection.close()


@app.route(
    "/api/incidents/<int:incident_id>/status",
    methods=["PATCH"]
)
def update_incident_status(incident_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")

    allowed_statuses = {
        "Open",
        "Investigating",
        "Resolved"
    }

    if status not in allowed_statuses:
        return jsonify({
            "error": (
                "Invalid status. Use Open, Investigating, "
                "or Resolved."
            )
        }), 400

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            UPDATE incidents
            SET status = ?
            WHERE id = ?
            """,
            (status, incident_id)
        )

        if cursor.rowcount == 0:
            connection.rollback()
            return jsonify({"error": "Incident not found."}), 404

        connection.commit()

        return jsonify({
            "success": True,
            "incident_id": incident_id,
            "status": status
        })

    finally:
        connection.close()


# --------------------------------------------------
# Network TCP Port Scanner API
# --------------------------------------------------

@app.route("/api/network/scan", methods=["POST"])
def scan_network_ports():
    data = request.get_json(silent=True) or {}

    target = str(data.get("target", "")).strip()
    port_range = str(data.get("port_range", "")).strip()

    # Validate target and requested TCP port range.
    try:
        address = ipaddress.ip_address(target)

        if not (
            address.is_private
            or address.is_loopback
            or address.is_link_local
        ):
            return jsonify({
                "error": (
                    "Only private or local IP addresses are allowed."
                )
            }), 400

        parts = port_range.split("-")

        if len(parts) == 1:
            start_port = end_port = int(parts[0])
        elif len(parts) == 2:
            start_port, end_port = map(int, parts)
        else:
            raise ValueError

        if not (
            1 <= start_port <= end_port <= 65535
            and end_port - start_port <= 65534
        ):
            raise ValueError

    except (ValueError, TypeError):
        return jsonify({
            "error": (
                "Enter a valid IP address and port range between "
                "1 and 65535, e.g. 1-1000 or 1-65535."
            )
        }), 400

    def check_port(port):
        try:
            with socket.socket(
                socket.AF_INET,
                socket.SOCK_STREAM
            ) as sock:
                sock.settimeout(0.4)
                result = sock.connect_ex((target, port))

            if result == 0:
                try:
                    service = socket.getservbyport(port, "tcp").upper()
                except OSError:
                    service = "Unknown"

                return {
                    "port": port,
                    "state": "Open",
                    "service": service
                }

        except OSError:
            pass

        return None

    try:
        with ThreadPoolExecutor(max_workers=50) as executor:
            results = list(
                executor.map(
                    check_port,
                    range(start_port, end_port + 1)
                )
            )

        open_ports = [
            result for result in results
            if result is not None
        ]

        return jsonify({
            "target": target,
            "scanned_ports": end_port - start_port + 1,
            "results": open_ports
        })

    except Exception:
        app.logger.exception("TCP port scan failed")

        return jsonify({
            "error": "The port scan could not be completed."
        }), 500


# --------------------------------------------------
# Network Information API
# Retained for compatibility with existing frontend code.
# --------------------------------------------------

@app.route("/api/network/info", methods=["GET"])
def get_network_info():
    interface = None
    ip_address = None
    gateway = None

    try:
        route = subprocess.run(
            ["ip", "route", "show", "default"],
            capture_output=True,
            text=True,
            timeout=3,
            check=False
        )

        for line in route.stdout.splitlines():
            parts = line.split()

            if "dev" in parts:
                interface = parts[parts.index("dev") + 1]

                if "via" in parts:
                    gateway = parts[parts.index("via") + 1]

                break

        if interface:
            address_result = subprocess.run(
                [
                    "ip", "-4", "-o", "addr", "show",
                    "dev", interface, "scope", "global"
                ],
                capture_output=True,
                text=True,
                timeout=3,
                check=False
            )

            for line in address_result.stdout.splitlines():
                parts = line.split()

                if "inet" in parts:
                    ip_address = (
                        parts[parts.index("inet") + 1].split("/")[0]
                    )
                    break

        connected = bool(interface and ip_address)

        return jsonify({
            "interface": interface or "Unavailable",
            "ip_address": ip_address or "Unavailable",
            "gateway": gateway or "Unavailable",
            "status": "Connected" if connected else "Disconnected"
        })

    except (OSError, subprocess.SubprocessError):
        app.logger.exception("Could not read network configuration")

        return jsonify({
            "interface": "Unavailable",
            "ip_address": "Unavailable",
            "gateway": "Unavailable",
            "status": "Unable to determine"
        }), 500


# --------------------------------------------------
# Start Flask Application
# --------------------------------------------------

if __name__ == "__main__":
    print("ETERNAL Flask API starting on port 5001...")

    app.run(
        host="0.0.0.0",
        port=5001,
        debug=False
    )