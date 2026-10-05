import socket
import json

HOST = "0.0.0.0"
PORT = 5000

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind((HOST, PORT))
server.listen(5)

print(f"ETERNAL Manager listening on port {PORT}...")

while True:
    connection, address = server.accept()

    print(f"Agent connected: {address}")

    data = connection.recv(4096)

    if data:
        try:
            print("RAW DATA:", repr(data))
            event = json.loads(data.decode("utf-8"))

            print("Event received:")
            print(event)

        except json.JSONDecodeError:
            print("Received invalid JSON.")

    connection.close()