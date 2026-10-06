import socket
import json
import sqlite3

HOST = "0.0.0.0"
PORT = 5000
DATABASE_PATH = "Database/eternal.db"


def get_agent_id(agent_name, ip_address):
    connection_db = sqlite3.connect(DATABASE_PATH)
    cursor = connection_db.cursor()

    cursor.execute(
        "SELECT id FROM agents WHERE name = ?",
        (agent_name,)
    )

    agent = cursor.fetchone()

    if agent:
        agent_id = agent[0]

        cursor.execute(
            """
            UPDATE agents
            SET status = ?, ip_address = ?
            WHERE id = ?
            """,
            ("Active", ip_address, agent_id)
        )

        connection_db.commit()
        connection_db.close()

        return agent_id

    cursor.execute(
        """
        INSERT INTO agents (
            name,
            status,
            ip_address
        )
        VALUES (?, ?, ?)
        """,
        (
            agent_name,
            "Active",
            ip_address
        )
    )

    connection_db.commit()

    agent_id = cursor.lastrowid

    connection_db.close()

    return agent_id


def store_event(event, agent_id):
    connection_db = sqlite3.connect(DATABASE_PATH)
    cursor = connection_db.cursor()

    cursor.execute(
        """
        INSERT INTO events (
            agent_id,
            timestamp,
            event_type,
            source_ip,
            username,
            severity,
            description
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            agent_id,
            event["timestamp"],
            event["event_type"],
            event.get("source_ip"),
            event.get("username"),
            event.get("severity"),
            event.get("description")
        )
    )

    cursor.execute(
        """
        UPDATE agents
        SET last_communication = ?,
            event_count = event_count + 1,
            status = ?
        WHERE id = ?
        """,
        (
            event["timestamp"],
            "Active",
            agent_id
        )
    )

    connection_db.commit()
    connection_db.close()


server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

server.bind((HOST, PORT))
server.listen(5)

print(f"ETERNAL Manager listening on port {PORT}...")

while True:
    connection, address = server.accept()

    print(f"Agent connected: {address}")

    data = connection.recv(4096)

    if data:
        try:
            message = json.loads(data.decode("utf-8"))

            message_type = message.get("type")

            if message_type == "registration":

                agent_name = message["agent"]

                agent_id = get_agent_id(
                    agent_name,
                    address[0]
                )

                print(
                    f"Agent registered: "
                    f"{agent_name} (ID: {agent_id})"
                )

            elif message_type == "event":

                agent_name = message["agent"]

                agent_id = get_agent_id(
                    agent_name,
                    address[0]
                )

                store_event(
                    message,
                    agent_id
                )

                print(
                    f"Event stored from "
                    f"{agent_name} (ID: {agent_id})"
                )

            else:
                print("Unknown message type.")

        except json.JSONDecodeError:
            print("Received invalid JSON.")

        except KeyError as error:
            print(f"Missing field in message: {error}")

    connection.close()