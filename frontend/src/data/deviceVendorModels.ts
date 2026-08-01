// Device onboarding catalog. Generated from the design prototype
// (device-vendor-models.jsx) via backend/scripts/gen_data_ts.mjs.
import type { OnboardDeviceType, MonitoringMethod, VendorModel, CredentialProfile } from "@/lib/types";

export const ONBOARD_DEVICE_TYPES: OnboardDeviceType[] = [
  {
    "id": "firewall",
    "label": "Firewall",
    "icon": "fa-shield-halved"
  },
  {
    "id": "router",
    "label": "Router",
    "icon": "fa-route"
  },
  {
    "id": "switch",
    "label": "Switch",
    "icon": "fa-network-wired"
  },
  {
    "id": "loadbal",
    "label": "Load balancer",
    "icon": "fa-scale-balanced"
  },
  {
    "id": "linux-srv",
    "label": "Linux server",
    "icon": "fa-linux",
    "brand": true
  },
  {
    "id": "win-srv",
    "label": "Windows server",
    "icon": "fa-windows",
    "brand": true
  },
  {
    "id": "phys-srv",
    "label": "Physical server",
    "icon": "fa-server"
  },
  {
    "id": "vm",
    "label": "VM",
    "icon": "fa-cube"
  },
  {
    "id": "k8s",
    "label": "Kubernetes node",
    "icon": "fa-dharmachakra"
  },
  {
    "id": "storage",
    "label": "Storage",
    "icon": "fa-database"
  },
  {
    "id": "oob",
    "label": "iDRAC / iLO",
    "icon": "fa-microchip"
  },
  {
    "id": "generic",
    "label": "Generic SNMP",
    "icon": "fa-tower-broadcast"
  }
];

export const SWITCH_ROLES: string[] = [
  "L2 Access",
  "L3 Access",
  "Distribution",
  "Core",
  "PoE Access",
  "Stack",
  "Modular Core",
  "Edge"
];

export const MONITORING_METHODS: MonitoringMethod[] = [
  {
    "id": "snmp",
    "label": "SNMP",
    "hint": "v2c/v3 polling — switches, routers, firewalls, UPS. Needs community string or v3 user."
  },
  {
    "id": "node",
    "label": "Node Exporter",
    "hint": "Linux agent on :9100 — CPU, memory, disk, NIC. Install via ansible role or rpm/deb."
  },
  {
    "id": "wmi",
    "label": "Windows Exporter",
    "hint": "Windows agent on :9182 — CPU, memory, disk, services, IIS/SQL collectors."
  },
  {
    "id": "blackbox",
    "label": "Blackbox Ping",
    "hint": "ICMP/TCP/HTTP probe from the poller — availability + latency only, agentless."
  },
  {
    "id": "oob",
    "label": "iDRAC / iLO",
    "hint": "Out-of-band Redfish/IPMI — power, fans, temperature, RAID, even when OS is down."
  },
  {
    "id": "api",
    "label": "API Polling",
    "hint": "Vendor REST API (vCenter, Purity, ONTAP, FortiOS). Needs API token."
  }
];

export const VENDOR_MODELS: Record<string, VendorModel[]> = {
  "Cisco": [
    {
      "model": "Catalyst 2960",
      "type": "switch",
      "methods": [
        "snmp",
        "blackbox"
      ],
      "snmp": "cisco-ios-legacy",
      "role": "L2 Access",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "poe"
      ]
    },
    {
      "model": "Catalyst 3560",
      "type": "switch",
      "methods": [
        "snmp",
        "blackbox"
      ],
      "snmp": "cisco-ios-legacy",
      "role": "L3 Access",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "poe"
      ]
    },
    {
      "model": "Catalyst 3750",
      "type": "switch",
      "methods": [
        "snmp",
        "blackbox"
      ],
      "snmp": "cisco-ios-legacy",
      "role": "L3 Access",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "stack",
        "poe"
      ]
    },
    {
      "model": "Catalyst 3850",
      "type": "switch",
      "methods": [
        "snmp",
        "blackbox"
      ],
      "snmp": "cisco-iosxe",
      "role": "Distribution",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "stack",
        "poe",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "Catalyst 9200",
      "type": "switch",
      "methods": [
        "snmp",
        "api",
        "blackbox"
      ],
      "snmp": "cisco-iosxe",
      "role": "L2 Access",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "stack",
        "poe",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "Catalyst 9300",
      "type": "switch",
      "methods": [
        "snmp",
        "api",
        "blackbox"
      ],
      "snmp": "cisco-iosxe",
      "role": "L3 Access",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "stack",
        "poe",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "Catalyst 9400",
      "type": "switch",
      "methods": [
        "snmp",
        "api",
        "blackbox"
      ],
      "snmp": "cisco-iosxe",
      "role": "Modular Core",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "ha",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "Catalyst 9500",
      "type": "switch",
      "methods": [
        "snmp",
        "api",
        "blackbox"
      ],
      "snmp": "cisco-iosxe",
      "role": "Core",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "ha",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "Nexus 3000",
      "type": "switch",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "cisco-nxos",
      "role": "L3 Access / ToR",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "Nexus 5000",
      "type": "switch",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "cisco-nxos",
      "role": "Distribution",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "ha",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "Nexus 7000",
      "type": "switch",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "cisco-nxos",
      "role": "Modular Core",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "ha",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "ISR Router",
      "type": "router",
      "methods": [
        "snmp",
        "blackbox"
      ],
      "snmp": "cisco-iosxe",
      "role": "Edge",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "routing"
      ]
    },
    {
      "model": "ASR Router",
      "type": "router",
      "methods": [
        "snmp",
        "api",
        "blackbox"
      ],
      "snmp": "cisco-iosxe",
      "role": "Edge",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "routing",
        "ha",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "ASA Firewall",
      "type": "firewall",
      "methods": [
        "snmp",
        "blackbox"
      ],
      "snmp": "cisco-asa",
      "role": "Firewall",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "firewall",
        "ha"
      ]
    },
    {
      "model": "Firepower Firewall",
      "type": "firewall",
      "methods": [
        "snmp",
        "api",
        "blackbox"
      ],
      "snmp": "cisco-ftd",
      "role": "Firewall",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "firewall",
        "ha",
        "power",
        "fan",
        "temperature"
      ]
    }
  ],
  "Aruba": [
    {
      "model": "Aruba 2530",
      "type": "switch",
      "methods": [
        "snmp",
        "blackbox"
      ],
      "snmp": "aruba-procurve",
      "role": "L2 Access",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "poe"
      ]
    },
    {
      "model": "Aruba 2540",
      "type": "switch",
      "methods": [
        "snmp",
        "blackbox"
      ],
      "snmp": "aruba-procurve",
      "role": "L2 Access",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "poe"
      ]
    },
    {
      "model": "Aruba 2930F",
      "type": "switch",
      "methods": [
        "snmp",
        "api",
        "blackbox"
      ],
      "snmp": "aruba-procurve",
      "role": "L3 Access",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "stack",
        "poe"
      ]
    },
    {
      "model": "Aruba 2930M",
      "type": "switch",
      "methods": [
        "snmp",
        "api",
        "blackbox"
      ],
      "snmp": "aruba-procurve",
      "role": "L3 Access",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "stack",
        "poe",
        "power"
      ]
    },
    {
      "model": "Aruba 3810M",
      "type": "switch",
      "methods": [
        "snmp",
        "api",
        "blackbox"
      ],
      "snmp": "aruba-procurve",
      "role": "Distribution",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "stack",
        "poe",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "Aruba 5400R",
      "type": "switch",
      "methods": [
        "snmp",
        "api",
        "blackbox"
      ],
      "snmp": "aruba-procurve",
      "role": "Modular Core",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "ha",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "Aruba CX 6100",
      "type": "switch",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "aruba-cx",
      "role": "L2 Access",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "poe"
      ]
    },
    {
      "model": "Aruba CX 6200",
      "type": "switch",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "aruba-cx",
      "role": "L3 Access",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "stack",
        "poe"
      ]
    },
    {
      "model": "Aruba CX 6300",
      "type": "switch",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "aruba-cx",
      "role": "Distribution",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "stack",
        "poe",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "Aruba CX 6400",
      "type": "switch",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "aruba-cx",
      "role": "Modular Core",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "ha",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "Aruba CX 8320",
      "type": "switch",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "aruba-cx",
      "role": "Core",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "ha",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "Aruba CX 8400",
      "type": "switch",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "aruba-cx",
      "role": "Modular Core",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "ha",
        "power",
        "fan",
        "temperature"
      ]
    }
  ],
  "Arista": [
    {
      "model": "7050X3",
      "type": "switch",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "arista-eos",
      "role": "L3 Access / ToR",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "7280R3",
      "type": "switch",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "arista-eos",
      "role": "Distribution",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "ha",
        "power",
        "fan",
        "temperature"
      ]
    }
  ],
  "Juniper": [
    {
      "model": "EX4650",
      "type": "switch",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "juniper-junos",
      "role": "Distribution",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "MX204",
      "type": "router",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "juniper-junos",
      "role": "Edge",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "routing",
        "ha",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "SRX1500",
      "type": "firewall",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "juniper-srx",
      "role": "Firewall",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "firewall",
        "ha"
      ]
    }
  ],
  "Fortinet": [
    {
      "model": "FortiGate 100F",
      "type": "firewall",
      "methods": [
        "snmp",
        "api",
        "blackbox"
      ],
      "snmp": "fortinet-fortios",
      "role": "Firewall",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "firewall",
        "ha",
        "temperature"
      ]
    },
    {
      "model": "FortiGate 600F",
      "type": "firewall",
      "methods": [
        "snmp",
        "api",
        "blackbox"
      ],
      "snmp": "fortinet-fortios",
      "role": "Firewall",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "firewall",
        "ha",
        "power",
        "fan",
        "temperature"
      ]
    }
  ],
  "Palo Alto": [
    {
      "model": "PA-3260",
      "type": "firewall",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "paloalto-panos",
      "role": "Firewall",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "firewall",
        "ha",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "PA-5450",
      "type": "firewall",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "paloalto-panos",
      "role": "Firewall",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "firewall",
        "ha",
        "power",
        "fan",
        "temperature"
      ]
    }
  ],
  "Check Point": [
    {
      "model": "Quantum 6200",
      "type": "firewall",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "checkpoint-gaia",
      "role": "Firewall",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "firewall",
        "ha"
      ]
    }
  ],
  "Dell": [
    {
      "model": "PowerEdge R750",
      "type": "phys-srv",
      "methods": [
        "node",
        "oob",
        "blackbox"
      ],
      "snmp": "dell-idrac9",
      "role": "Server",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "power",
        "fan",
        "temperature"
      ]
    },
    {
      "model": "PowerEdge R760",
      "type": "phys-srv",
      "methods": [
        "node",
        "oob",
        "blackbox"
      ],
      "snmp": "dell-idrac9",
      "role": "Server",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "power",
        "fan",
        "temperature"
      ]
    }
  ],
  "HP / HPE": [
    {
      "model": "ProLiant DL380 Gen11",
      "type": "phys-srv",
      "methods": [
        "node",
        "oob",
        "blackbox"
      ],
      "snmp": "hpe-ilo6",
      "role": "Server",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "power",
        "fan",
        "temperature"
      ]
    }
  ],
  "Lenovo": [
    {
      "model": "ThinkSystem SR650",
      "type": "phys-srv",
      "methods": [
        "node",
        "oob",
        "blackbox"
      ],
      "snmp": "lenovo-xcc",
      "role": "Server",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "power",
        "fan",
        "temperature"
      ]
    }
  ],
  "Huawei": [
    {
      "model": "CloudEngine S5731",
      "type": "switch",
      "methods": [
        "snmp"
      ],
      "snmp": "huawei-vrp",
      "role": "L3 Access",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "routing",
        "poe"
      ]
    }
  ],
  "MikroTik": [
    {
      "model": "CCR2116",
      "type": "router",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "mikrotik-routeros",
      "role": "Edge",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "routing"
      ]
    }
  ],
  "Ubiquiti": [
    {
      "model": "UniFi USW-Pro-48",
      "type": "switch",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "ubiquiti-unifi",
      "role": "L2 Access",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "poe"
      ]
    }
  ],
  "Netgear": [
    {
      "model": "M4300",
      "type": "switch",
      "methods": [
        "snmp"
      ],
      "snmp": "netgear-m4300",
      "role": "L2 Access",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "vlan",
        "poe"
      ]
    }
  ],
  "F5": [
    {
      "model": "BIG-IP i5800",
      "type": "loadbal",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "f5-tmos",
      "role": "Load Balancer",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "ha",
        "power",
        "fan",
        "temperature"
      ]
    }
  ],
  "Citrix": [
    {
      "model": "NetScaler MPX",
      "type": "loadbal",
      "methods": [
        "snmp",
        "api"
      ],
      "snmp": "citrix-adc",
      "role": "Load Balancer",
      "caps": [
        "cpu",
        "memory",
        "interfaces",
        "ha"
      ]
    }
  ],
  "Generic": [
    {
      "model": "Generic SNMP device",
      "type": "generic",
      "methods": [
        "snmp",
        "blackbox"
      ],
      "snmp": "generic-mib2",
      "role": "Unassigned",
      "caps": [
        "interfaces"
      ]
    }
  ]
};

export const CAP_LABELS: Record<string, string> = {
  "cpu": "CPU",
  "memory": "Memory",
  "interfaces": "Interfaces",
  "vlan": "VLANs",
  "routing": "Routing",
  "firewall": "Firewall policy",
  "ha": "HA state",
  "power": "Power",
  "fan": "Fans",
  "temperature": "Temperature",
  "stack": "Stacking",
  "poe": "PoE"
};

export const CREDENTIAL_PROFILES: CredentialProfile[] = [
  {
    "id": "cp-1",
    "name": "snmp-v3-netops",
    "method": "snmp",
    "detail": "SNMPv3 · SHA-256 / AES-128 · user netops-ro"
  },
  {
    "id": "cp-2",
    "name": "snmp-v2c-legacy",
    "method": "snmp",
    "detail": "SNMPv2c · community m3rid1an-ro"
  },
  {
    "id": "cp-3",
    "name": "idrac-svc-account",
    "method": "oob",
    "detail": "Redfish · svc-idrac · vault-backed"
  },
  {
    "id": "cp-4",
    "name": "linux-node-default",
    "method": "node",
    "detail": "node-exporter :9100 · mTLS scrape"
  },
  {
    "id": "cp-5",
    "name": "win-exporter-gMSA",
    "method": "wmi",
    "detail": "windows-exporter :9182 · gMSA svc account"
  }
];
