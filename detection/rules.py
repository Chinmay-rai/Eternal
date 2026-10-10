RULES = [
    {
        "rule_key": "WINDOWS_BRUTE_FORCE",
        "name": "Repeated Failed Logins",
        "description": (
            "Detects 4 or more failed login attempts "
            "on the same agent within 60 seconds."
        ),
        "severity": "high",
        "detection_type": "threshold",
        "event_type": "failed_login",
        "threshold": 4,
        "window_seconds": 60,
        "group_by": ["agent_id", "source_ip"],
        "incident_key": "brute_force",
        "incident_name": "Brute-Force Login Attack",
        "enabled": True
    },
    {
        "rule_key": "FAILED_LOGINS_THEN_SUCCESS",
        "name": "Failed Logins Followed by Success",
        "description": (
            "Detects 4 failed logins followed by a "
            "successful login for the same account "
            "within 5 minutes."
        ),
        "severity": "high",
        "detection_type": "sequence",
        "first_event_type": "failed_login",
        "first_event_threshold": 4,
        "second_event_type": "successful_login",
        "window_seconds": 300,
        "group_by": ["agent_id", "username"],
        "incident_key": "failed_logins_then_success",
        "incident_name": "Suspicious Login Sequence",
        "enabled": True
    },
    {
        "rule_key": "WINDOWS_ACCOUNT_CREATED",
        "name": "New User Account Created",
        "description": "Detects creation of a Windows user account.",
        "severity": "medium",
        "detection_type": "single_event",
        "event_type": "account_created",
        "group_by": ["agent_id", "username"],
        "incident_key": "account_lifecycle",
        "incident_name": "Suspicious Account Change",
        "enabled": True
    },
    {
        "rule_key": "WINDOWS_USER_ADDED_TO_GROUP",
        "name": "User Added to Local Group",
        "description": "Detects a user being added to a local Windows group.",
        "severity": "high",
        "detection_type": "single_event",
        "event_type": "user_added_to_local_group",
        "group_by": ["agent_id", "username"],
        "incident_key": "privilege_change",
        "incident_name": "Privilege Escalation or Group Change",
        "enabled": True
    },
    {
        "rule_key": "WINDOWS_ACCOUNT_ENABLED",
        "name": "User Account Enabled",
        "description": "Detects when a Windows account is enabled.",
        "severity": "medium",
        "detection_type": "single_event",
        "event_type": "account_enabled",
        "group_by": ["agent_id", "username"],
        "incident_key": "account_lifecycle",
        "incident_name": "Suspicious Account Change",
        "enabled": True
    },
    {
        "rule_key": "WINDOWS_ACCOUNT_DISABLED",
        "name": "User Account Disabled",
        "description": "Detects when a Windows account is disabled.",
        "severity": "medium",
        "detection_type": "single_event",
        "event_type": "account_disabled",
        "group_by": ["agent_id", "username"],
        "incident_key": "account_lifecycle",
        "incident_name": "Suspicious Account Change",
        "enabled": True
    },
    {
        "rule_key": "WINDOWS_ACCOUNT_DELETED",
        "name": "User Account Deleted",
        "description": "Detects when a Windows account is deleted.",
        "severity": "medium",
        "detection_type": "single_event",
        "event_type": "account_deleted",
        "group_by": ["agent_id", "username"],
        "incident_key": "account_lifecycle",
        "incident_name": "Suspicious Account Change",
        "enabled": True
    },
    {
        "rule_key": "FILE_MODIFIED",
        "name": "Monitored File Modified",
        "description": "Detects changes to a monitored file's hash.",
        "severity": "medium",
        "detection_type": "file_integrity",
        "enabled": False
    },
    {
        "rule_key": "FILE_DELETED",
        "name": "Monitored File Deleted",
        "description": "Detects deletion of a monitored file.",
        "severity": "high",
        "detection_type": "file_deletion",
        "enabled": False
    },
    {
        "rule_key": "NETWORK_PORT_SCAN",
        "name": "Possible Port Scan",
        "description": "Detects suspicious connections to multiple ports.",
        "severity": "medium",
        "detection_type": "port_scan",
        "enabled": False
    }
]