import socket
import json
from datetime import datetime

MANAGER_HOST = "192.168.1.68"
MANAGER_PORT = 5000

event = {
    "agent": "Windows-VM-01",
    "timestamp": datetime.now().isoformat(),
    "event_type": "login_failure",
    "source_ip": "192.168.1.50",
    "username": "Administrator",
    "severity": "medium",
    "description": "Failed Windows login"
}

message = json.dumps(event)

client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
client.connect((MANAGER_HOST, MANAGER_PORT))
client.sendall(message.encode("utf-8"))
client.close()

print("Event sent to ETERNAL Manager.")