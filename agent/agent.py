import json
import re
import socket
import subprocess
import time
import xml.etree.ElementTree as ET

MANAGER_HOST = "192.168.1.68"
MANAGER_PORT = 5000
AGENT_NAME = "Windows-VM-01"
POLL_INTERVAL = 2
QUERY_TIMEOUT = 10
SEND_TIMEOUT = 5

NS = "http://schemas.microsoft.com/win/2004/08/events/event"
EVENT_TYPES = {
    4624: "successful_login",
    4625: "failed_login",
    4634: "logout",
    4647: "user_initiated_logout",
    4672: "privileged_activity",
    4688: "process_creation",
    4720: "account_created",
    4722: "account_enabled",
    4725: "account_disabled",
    4726: "account_deleted",
    4732: "user_added_to_local_group",
    4733: "user_removed_from_local_group",
}
MONITORED_EVENT_IDS = tuple(EVENT_TYPES)


def send_message(message):
    payload = json.dumps(message).encode("utf-8")
    with socket.create_connection(
        (MANAGER_HOST, MANAGER_PORT), timeout=SEND_TIMEOUT
    ) as client:
        client.sendall(payload)


def run_wevtutil(args):
    return subprocess.run(
        ["wevtutil", *args],
        capture_output=True,
        text=True,
        timeout=QUERY_TIMEOUT,
        check=False,
    )


def parse_xml_document(output):
    # wevtutil can print multiple standalone <Event> XML documents back-to-back.
    # Parse each Event separately instead of treating the whole output as one XML file.
    event_tag = f"{{{NS}}}Event"
    event_chunks = re.findall(
        r"<Event(?:\s[^>]*)?>.*?</Event\s*>",
        output,
        flags=re.DOTALL,
    )

    events = []
    for chunk in event_chunks:
        try:
            root = ET.fromstring(chunk)
        except ET.ParseError:
            continue
        if root.tag == event_tag:
            events.append(root)

    # Retain support for a single wrapped XML document if no standalone events
    # were extracted by the pattern.
    if not events:
        root = ET.fromstring(output)
        if root.tag == event_tag:
            return [root]
        return list(root.iter(event_tag))
    return events


def get_latest_record_id():
    result = run_wevtutil(
        ["qe", "Security", "/c:1", "/rd:true", "/f:xml"]
    )
    if result.returncode != 0:
        details = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(details or "wevtutil could not read Security log")
    if not result.stdout.strip():
        return None

    events = parse_xml_document(result.stdout.strip())
    if not events:
        return None
    element = events[0].find(f".//{{{NS}}}EventRecordID")
    if element is None or not element.text:
        return None
    return int(element.text)


def get_security_events(last_record_id):
    event_filter = " or ".join(
        f"EventID={event_id}" for event_id in MONITORED_EVENT_IDS
    )
    xpath = (
        "*[System["
        f"(EventRecordID > {last_record_id}) and "
        f"({event_filter})"
        "]]"
    )
    result = run_wevtutil([
        "qe", "Security", f"/q:{xpath}", "/rd:false", "/f:xml"
    ])
    if result.returncode != 0:
        details = result.stderr.strip() or result.stdout.strip()
        # wevtutil can return a non-zero exit code when no events match.
        # Treat only recognizable no-match messages as an empty result.
        lowered = details.lower()
        if "no events were found" in lowered or "no events found" in lowered:
            return []
        raise RuntimeError(details or "wevtutil query failed")
    if not result.stdout.strip():
        return []
    return parse_xml_document(result.stdout.strip())


def parse_event(root):
    system = root.find(f"{{{NS}}}System")
    if system is None:
        return None

    id_node = system.find(f"{{{NS}}}EventID")
    record_node = system.find(f"{{{NS}}}EventRecordID")
    time_node = system.find(f"{{{NS}}}TimeCreated")
    if (
        id_node is None or not id_node.text
        or record_node is None or not record_node.text
        or time_node is None
    ):
        return None

    timestamp = time_node.attrib.get("SystemTime")
    if not timestamp:
        return None
    try:
        event_id = int(id_node.text)
        record_id = int(record_node.text)
    except ValueError:
        return None

    event_type = EVENT_TYPES.get(event_id)
    if event_type is None:
        return None

    data = {}
    data_node = root.find(f"{{{NS}}}EventData")
    if data_node is not None:
        for item in data_node:
            name = item.attrib.get("Name")
            if name:
                data[name] = item.text

    username = (
        data.get("TargetUserName")
        or data.get("SubjectUserName")
        or data.get("SubjectUser")
        or data.get("AccountName")
    )
    if username in ("-", ""):
        username = None

    source_ip = (
        data.get("IpAddress")
        or data.get("SourceNetworkAddress")
        or data.get("ClientAddress")
    )
    if source_ip in ("-", ""):
        source_ip = None

    if event_id == 4625 or event_id in (
        4672, 4688, 4720, 4722, 4725, 4726, 4732, 4733
    ):
        severity = "medium"
    else:
        severity = "low"

    return {
        "type": "event",
        "agent": AGENT_NAME,
        "timestamp": timestamp,
        "windows_event_id": event_id,
        "windows_record_id": record_id,
        "event_type": event_type,
        "source_ip": source_ip,
        "username": username,
        "severity": severity,
        "description": f"Windows Security Event {event_id}",
    }


def collect_new_events(last_record_id):
    events = []
    for xml_event in get_security_events(last_record_id):
        event = parse_event(xml_event)
        if event and event["windows_record_id"] > last_record_id:
            events.append(event)
    events.sort(key=lambda item: item["windows_record_id"])
    return events


def main():
    print("Starting ETERNAL Windows Agent...")
    try:
        send_message({"type": "registration", "agent": AGENT_NAME})
        print("Agent registration sent.")
    except Exception as error:
        print(f"Could not connect to ETERNAL Manager: {error}")
        return

    try:
        last_record_id = get_latest_record_id()
    except subprocess.TimeoutExpired:
        print("Timed out while reading the latest Security record.")
        return
    except Exception as error:
        print(f"Could not read latest Security record: {error}")
        return

    if last_record_id is None:
        print("Could not determine the latest Security record ID; agent stopped.")
        return

    print(f"Starting from Windows Record ID: {last_record_id}")
    print("ETERNAL Agent is now monitoring selected Windows Security events...")
    print("Monitored Event IDs: " + ", ".join(map(str, MONITORED_EVENT_IDS)))
    print(f"Polling every {POLL_INTERVAL} seconds using wevtutil.")

    while True:
        try:
            new_events = collect_new_events(last_record_id)
            if new_events:
                print(f"Found {len(new_events)} new monitored event(s).")

            for event in new_events:
                try:
                    send_message(event)
                except Exception as error:
                    print(
                        f"Failed to send event (Record ID "
                        f"{event['windows_record_id']}): {error}"
                    )
                    # Do not advance past a failed send; retry next poll.
                    break

                last_record_id = event["windows_record_id"]
                print(
                    "Windows Security event sent "
                    f"(Event ID: {event['windows_event_id']}, "
                    f"Type: {event['event_type']}, "
                    f"Username: {event['username']}, "
                    f"Record ID: {event['windows_record_id']})"
                )

        except subprocess.TimeoutExpired:
            print(f"Windows Security query timed out after {QUERY_TIMEOUT}s; retrying.")
        except Exception as error:
            print(f"Event collection error: {error}")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nETERNAL Agent stopped.")