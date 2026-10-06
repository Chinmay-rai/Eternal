import socket
import json
import subprocess
import xml.etree.ElementTree as ET
import time


MANAGER_HOST = "192.168.1.68"
MANAGER_PORT = 5000

AGENT_NAME = "Windows-VM-01"

POLL_INTERVAL = 2

EVENT_NAMESPACE = (
    "http://schemas.microsoft.com/win/2004/08/events/event"
)


# --------------------------------------------------
# Windows Security Event IDs monitored by ETERNAL
# --------------------------------------------------

EVENT_TYPES = {

    # Authentication
    4624: "successful_login",
    4625: "failed_login",

    # Logoff
    4634: "logout",
    4647: "user_initiated_logout",

    # Privilege
    4672: "privileged_activity",

    # Process
    4688: "process_creation",

    # Account management
    4720: "account_created",
    4722: "account_enabled",
    4725: "account_disabled",
    4726: "account_deleted",

    # Group management
    4732: "user_added_to_local_group",
    4733: "user_removed_from_local_group"
}


MONITORED_EVENT_IDS = tuple(
    EVENT_TYPES.keys()
)


# --------------------------------------------------
# Send message to ETERNAL Manager
# --------------------------------------------------

def send_message(message):

    client = socket.socket(
        socket.AF_INET,
        socket.SOCK_STREAM
    )

    try:

        client.connect(
            (MANAGER_HOST, MANAGER_PORT)
        )

        data = json.dumps(message)

        client.sendall(
            data.encode("utf-8")
        )

    finally:

        client.close()


# --------------------------------------------------
# Get newest Windows Security Record ID
# --------------------------------------------------

def get_latest_record_id():

    command = [
        "wevtutil",
        "qe",
        "Security",
        "/c:1",
        "/rd:true",
        "/f:xml"
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=10
    )

    if result.returncode != 0:

        error = result.stderr.strip()

        if error:
            print(
                f"Windows Event Log error: {error}"
            )

        return None


    output = result.stdout.strip()

    if not output:
        return None


    try:

        root = ET.fromstring(output)

        system = root.find(
            f"{{{EVENT_NAMESPACE}}}System"
        )

        if system is None:
            return None


        record_id_element = system.find(
            f"{{{EVENT_NAMESPACE}}}EventRecordID"
        )

        if record_id_element is None:
            return None


        return int(
            record_id_element.text
        )


    except (
        ET.ParseError,
        ValueError,
        TypeError
    ):

        return None


# --------------------------------------------------
# Get monitored Security events after last Record ID
# --------------------------------------------------

def get_security_events(last_record_id):

    event_id_filter = " or ".join(
        f"EventID={event_id}"
        for event_id in MONITORED_EVENT_IDS
    )


    xpath_filter = (
        "*[System["
        f"EventRecordID > {last_record_id} "
        "and "
        f"({event_id_filter})"
        "]]"
    )


    powershell_command = (
        "$events = Get-WinEvent "
        "-LogName Security "
        f"-FilterXPath '{xpath_filter}'; "
        "foreach ($event in $events) { "
        "$event.ToXml() "
        "}"
    )


    command = [
        "powershell",
        "-NoProfile",
        "-Command",
        powershell_command
    ]


    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=30
    )


    if result.returncode != 0:

        error = result.stderr.strip()

        # No matching events is normal.
        if "No events were found" in error:

            return []


        if error:

            print(
                f"Windows Event Log error: {error}"
            )


        return []


    output = result.stdout.strip()

    if not output:
        return []


    # --------------------------------------------------
    # Separate multiple XML events
    # --------------------------------------------------

    events = []

    current_event = ""


    for line in output.splitlines():

        line = line.strip()


        if line.startswith("<Event "):

            current_event = line


        elif current_event:

            current_event += line


        if (
            line.endswith("</Event>")
            and current_event
        ):

            events.append(
                current_event
            )

            current_event = ""


    return events


# --------------------------------------------------
# Parse one Windows Security event
# --------------------------------------------------

def parse_event(xml_data):

    try:

        root = ET.fromstring(
            xml_data
        )

    except ET.ParseError:

        return None


    system = root.find(
        f"{{{EVENT_NAMESPACE}}}System"
    )

    if system is None:
        return None


    # --------------------------------------------------
    # Event ID
    # --------------------------------------------------

    event_id_element = system.find(
        f"{{{EVENT_NAMESPACE}}}EventID"
    )

    if event_id_element is None:
        return None


    windows_event_id = int(
        event_id_element.text
    )


    # --------------------------------------------------
    # Windows Record ID
    # --------------------------------------------------

    record_id_element = system.find(
        f"{{{EVENT_NAMESPACE}}}EventRecordID"
    )

    if record_id_element is None:
        return None


    windows_record_id = int(
        record_id_element.text
    )


    # --------------------------------------------------
    # Timestamp
    # --------------------------------------------------

    time_element = system.find(
        f"{{{EVENT_NAMESPACE}}}TimeCreated"
    )

    if time_element is None:
        return None


    timestamp = time_element.attrib.get(
        "SystemTime"
    )

    if not timestamp:
        return None


    # --------------------------------------------------
    # ETERNAL event type
    # --------------------------------------------------

    event_type = EVENT_TYPES.get(
        windows_event_id
    )

    if event_type is None:
        return None


    # --------------------------------------------------
    # Extract EventData
    # --------------------------------------------------

    event_data = {}

    event_data_element = root.find(
        f"{{{EVENT_NAMESPACE}}}EventData"
    )

    if event_data_element is not None:

        for data in event_data_element:

            name = data.attrib.get(
                "Name"
            )

            if name:

                event_data[name] = data.text


    # --------------------------------------------------
    # Username
    # --------------------------------------------------

    username = (

        event_data.get(
            "TargetUserName"
        )

        or event_data.get(
            "SubjectUserName"
        )

        or event_data.get(
            "SubjectUser"
        )

        or event_data.get(
            "AccountName"
        )

    )


    if username in ["-", ""]:

        username = None


    # --------------------------------------------------
    # Source IP
    # --------------------------------------------------

    source_ip = (

        event_data.get(
            "IpAddress"
        )

        or event_data.get(
            "SourceNetworkAddress"
        )

        or event_data.get(
            "ClientAddress"
        )

    )


    if source_ip in ["-", ""]:

        source_ip = None


    # --------------------------------------------------
    # Severity
    # --------------------------------------------------

    if windows_event_id == 4625:

        severity = "medium"


    elif windows_event_id in [

        4672,
        4688,
        4720,
        4722,
        4725,
        4726,
        4732,
        4733

    ]:

        severity = "medium"


    else:

        severity = "low"


    # --------------------------------------------------
    # Description
    # --------------------------------------------------

    description = (
        f"Windows Security Event "
        f"{windows_event_id}"
    )


    # --------------------------------------------------
    # Build normalized ETERNAL event
    # --------------------------------------------------

    return {

        "type": "event",

        "agent": AGENT_NAME,

        "timestamp": timestamp,

        "windows_event_id":
            windows_event_id,

        "windows_record_id":
            windows_record_id,

        "event_type":
            event_type,

        "source_ip":
            source_ip,

        "username":
            username,

        "severity":
            severity,

        "description":
            description
    }


# --------------------------------------------------
# Collect new monitored events
# --------------------------------------------------

def collect_new_events(last_record_id):

    events = get_security_events(
        last_record_id
    )

    parsed_events = []


    for xml_data in events:

        event = parse_event(
            xml_data
        )

        if event is None:
            continue


        # Extra safety check.
        # Only finalized ETERNAL events are allowed.

        if (
            event["windows_event_id"]
            not in MONITORED_EVENT_IDS
        ):

            continue


        if (
            event["windows_record_id"]
            <= last_record_id
        ):

            continue


        parsed_events.append(
            event
        )


    # --------------------------------------------------
    # Oldest first
    # --------------------------------------------------

    parsed_events.sort(
        key=lambda event:
        event["windows_record_id"]
    )


    return parsed_events


# ==================================================
# AGENT STARTUP
# ==================================================

print(
    "Starting ETERNAL Windows Agent..."
)


# --------------------------------------------------
# Register agent
# --------------------------------------------------

registration = {

    "type": "registration",

    "agent": AGENT_NAME

}


try:

    send_message(
        registration
    )

    print(
        "Agent registration sent."
    )


except Exception as error:

    print(
        f"Could not connect to ETERNAL Manager: {error}"
    )

    raise SystemExit


# --------------------------------------------------
# Establish starting position
# --------------------------------------------------

latest_record_id = (
    get_latest_record_id()
)


if latest_record_id is None:

    print(
        "No Windows Security events found."
    )

    raise SystemExit


print(
    f"Starting from Windows Record ID: "
    f"{latest_record_id}"
)


# Do not process old events.
# Only events created after Agent startup
# will be collected.

last_record_id = (
    latest_record_id
)


print(
    "ETERNAL Agent is now monitoring "
    "selected Windows Security events..."
)


print(
    "Monitored Event IDs: "
    + ", ".join(
        str(event_id)
        for event_id in MONITORED_EVENT_IDS
    )
)


# ==================================================
# CONTINUOUS MONITORING LOOP
# ==================================================

while True:

    try:

        new_events = (
            collect_new_events(
                last_record_id
            )
        )


        for event in new_events:

            try:

                send_message(
                    event
                )


                print(
                    "Windows Security event sent "
                    f"(Event ID: "
                    f"{event['windows_event_id']}, "
                    f"Type: "
                    f"{event['event_type']}, "
                    f"Username: "
                    f"{event['username']}, "
                    f"Record ID: "
                    f"{event['windows_record_id']})"
                )


                # Advance only after successful
                # transmission.

                last_record_id = (
                    event["windows_record_id"]
                )


            except Exception as error:

                print(
                    f"Failed to send event: {error}"
                )


        time.sleep(
            POLL_INTERVAL
        )


    except subprocess.TimeoutExpired:

        print(
            "Windows Event Log query timed out."
        )

        time.sleep(
            POLL_INTERVAL
        )


    except KeyboardInterrupt:

        print(
            "\nETERNAL Agent stopped."
        )

        break


    except Exception as error:

        print(
            f"Agent error: {error}"
        )

        time.sleep(
            POLL_INTERVAL
        )