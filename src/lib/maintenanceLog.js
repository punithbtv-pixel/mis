// Plant → Section → Equipment master list, staff roster and maintenance-type
// definitions for the Daily Log Entry / Daily Log Data pages. Extracted from
// the "Daily_Act.xlsx" equipment list.

export const PLANT_TREE = {
  Milling: {
    sections: [
      "Utility Section",
      "Milling Section",
      "Sorting Section",
      "Bagging Section",
      "Silo / Bin Section",
    ],
    items: {
      "Utility Section": ["General", "Electric supply", "Water", "Compressor Air", "UPS", "P_M Bridge", "Wearhouse"],
      "Milling Section": [
        "Electrical Panel", "CC1 / Chain conveyor", "E1 / Bucket Elevator", "MVSF 100G 'A' / MVSF Aspiration",
        "MVSF 100G 'B' / MVSF Aspiration", "MTSD 100/1200 'B' / MTSD Destoner", "E2 / Bucket Elevator",
        "E3 / Bucket Elevator", "CC2 / Chain conveyor", "Airlock - for (FAN-1)", "FAN-1",
        "AIRLOCK- for MPSN (FAN-2)", "FAN-2", "AIRLOCK - for MPSN (FAN-3)", "FAN-3", "SC10 / Screw Conveyor",
        "SC11 / Screw Conveyor", "DRSD-IV 'A' / DRSD Hullseparator", "DRSD-IV 'B' / DRSD Hull separator",
        "DRSD-IV 'C' / DRSD Hullseparator", "DRSD-IV 'D' / DRSD Hull separator", "CC3 / Chain conveyor",
        "Husk blower", "Airlock-For Husk Hopper", "E4 / Bucket Elevator", "SC1 / Screw Conveyor",
        "MVSE-150 / MVSE Aspiration", "MGCZ Paddy separator", "SC2 / Screw Conveyor", "SC3 / Screw Conveyor",
        "SC4 / Screw Conveyor", "Airlock- For MPSN (FAN-4)", "Fan-4", "Airlock- For MPS (FAN-7)", "Fan-7",
        "E5 / Bucket Elevator", "SAP- DE-Stoner-1", "SAP- DE-Stoner-2", "E6 / Bucket Elevator",
        "E7 / Bucket Elevator", "DRWA'A' / DRWA Ultrawhite", "Airlock- MPSN (FAN-6)", "FAN-6",
        "SF-1 / Screw Conveyor", "E8 / Bucket Elevator", "SC12 / Screw Conveyor", "SC13 / Screw Conveyor",
        "MTRA Classifier MTRA100/200 DL B", "DRWA'B' / DRWA Ultrawhite", "SF-2 / Screw Conveyor",
        "E9 / Bucket Elevator", "DRWA'C' / DRWA Ultrawhite", "SF-3 / Screw Conveyor", "E10 / Bucket Elevator",
        "DRWA'D' / DRWA Ultrawhite", "E11 / Bucket Elevator", "MVSE-150G / MVSE Aspiration",
        "MTRA Classifier MTRA100/200", "E12 / Bucket Elevator", "Airlock- MPS (FAN-9)", "FAN-9",
        "DRPG 'A' / DRPG Main", "DRPG 'A' / DRPG Water pump", "E13 / Bucket Elevator",
        "Airlock- MPSN (FAN-5)", "FAN-5", "DRPG 'B' / DRPG Main", "DRPG 'B' / DRPG Water pump",
        "E14 / Bucket Elevator", "DRPG 'C' / DRPG Main", "E15 / Bucket Elevator",
        "Indent Cylinder- DRIV LADB, UN-401/9 A", "E16 / Bucket Elevator",
        "Indent Cylinder- DRIV LADB, UN-401/9 B", "E17 / Bucket Elevator", "E18 / Bucket Elevator",
        "SC5 / Screw Conveyor", "SC6 / Screw Conveyor", "BC1 / Belt Conveyor", "E19 / Bucket Elevator",
        "SAP RICE DE-STONER", "E20 / Bucket Elevator", "SC7 / Screw Conveyor", "BC2 / Belt Conveyor",
        "BC3 / Belt Conveyor", "E21 / Bucket Elevator", "E22 / Bucket Elevator", "E23 / Bucket Elevator",
        "E24 / Bucket Elevator", "E25 / Bucket Elevator", "Indent Cylinder LADB, UN-401/9 C",
        "Indent Cylinder LADB, UN-401/9 D", "SC8 / Screw Conveyor", "E26 / Bucket Elevator",
        "E35 / Bucket Elevator", "E36 / Bucket Elevator", "E37 / Bucket Elevator", "Airlock (FAN-11)",
        "FAN-11", "Indent Cylinder SAP Granderr A", "Indent Cylinder SAP Granderr B",
        "Indent Cylinder SAP Granderr C", "Indent Cylinder SAP Granderr D", "E27 / Bucket Elevator",
        "E28 / Bucket Elevator", "E29 / Bucket Elevator", "E30 / Bucket Elevator", "E31 / Bucket Elevator",
        "BC4 / Belt Conveyor", "BC6 / Belt Conveyor", "SC9 / Screw Conveyor", "BC5 / Belt Conveyor",
        "E32 / Bucket Elevator", "E33 / Bucket Elevator", "BC7 / Belt Conveyor", "BC8 / Belt Conveyor",
        "Airlock- MPS (FAN-10)", "FAN-10", "E34 / Bucket Elevator", "SC-14 / Conveyor",
        "BRAN Tip Separator A", "BRAN Tip Separator B",
      ],
      "Sorting Section": ["Sortex-R500", "Sortex-Spark Pro 10_A", "Sortex-SPARK PRO-7_A", "Sortex-Spark Pro 10_B", "Sortex-SPARK PRO-7_B"],
      "Bagging Section": ["Packing Machine-1", "Packing Machine-2", "Packing Machine-3", "Packing Machine-4"],
      "Silo / Bin Section": [
        "Silo -1", "Bin-1", "Bin-2", "Bin-3", "Bin-4", "Bin-5", "Bin-6", "Bin-7", "Bin-8", "Bin-9", "Bin-10",
        "Bin-11", "Bin-12", "Bin-13", "Broken Rice Bin-14", "Head Rice Bin-15", "Primary Bin-16", "Primary Bin-17",
        "Secondary Bin-18", "HR Tertiary Bin-19", "BR Primary Bin-20", "BR Secondary Bin-21", "Bin-22",
        "Broken Rice packing Bin-23", "BR1 Bin-24", "BR2 Bin-25", "HR1 Bin-26", "HR2 Bin-27", "Packing Bin-28",
        "Packing Bin-29", "Primary Bin-30", "Secondary Bin-31", "Tertiary Bin-32",
      ],
    },
  },
  Parboiling: {
    sections: ["Utility Section", "Precleaning Section", "Socking Section", "Drying Section", "Silo / Bin Section"],
    items: {
      "Utility Section": ["General", "Electric supply", "Water", "Compressor Air", "CRS", "Steam"],
      "Precleaning Section": [
        "Electrical Panel", "PRE-CLEANER-1 ELEVATOR-1", "PRE CLEANER-1(A)", "PRE CLEANER-1(B)",
        "PRE-CLEANER-2 ELEVATOR-2", "DESTONER -1", "DESTONER -2", "DESTONER BLOWER", "DESTONER AIRLOCK",
        "BELT CONVEYOR -1", "PRE-CLEANER-3 ELEVATOR-1A", "DRUM SIEVE", "PRE-CLEANER-3 ELEVATOR-2A",
        "CLEANER FEEDER MOTOR", "TAS MAIN MOTOR", "PRE-CLEANER-3 ELEVATOR-3A", "PRE-CLEANER BLOWER",
        "PRE-CLEANER AIRLOCK",
      ],
      "Socking Section": [
        "Electrical Panel", "SILO ELEVATOR-3", "BELT CONVEYOR -2", "BIN ELEVATOR-4", "CHAIN CONVEYOR-1",
        "DRYER CLEANING HP PUMP-7", "HOT WATER TANK FEEDING PUMP-8", "HOT WATER TANK FEEDING PUMP-9",
        "HOT WATER TANK FEEDING PUMP-10", "HOT WATER TANK FEEDING PUMP-11", "BELT CONVEYOR-3",
        "POST STEAMING ELEVATOR-5", "ONC AIRLOCK-1", "ONC AIRLOCK-2",
      ],
      "Drying Section": [
        "Electrical Panel", "BELT CONVEYOR-4", "BELT CONVEYOR-5", "BELT CONVEYOR-6", "DRYER-1 ELEVATOR-6",
        "DRYER-1 ROTOR", "DRYER-1 BLOWER", "DRYER-2 ELEVATOR-7", "DRYER-2 ROTOR", "DRYER-2 BLOWER",
        "DRYER-3 ELEVATOR-8", "DRYER-3 ROTOR", "DRYER-3 BLOWER", "DRYER-4 ELEVATOR-9", "DRYER-4 ROTOR",
        "DRYER-4 BLOWER", "TOWER ELEVATOR-10", "DRYER-5 ELEVATOR-11", "DRYER-5 ROTOR", "DRYER-5 BLOWER",
        "DRYER-6 ELEVATOR-12", "DRYER-6 ROTOR", "DRYER-6 BLOWER", "DRYER-7 ELEVATOR-13", "DRYER-7 ROTOR",
        "DRYER-7 BLOWER", "DRYER-8 ELEVATOR-14", "DRYER-8 ROTOR", "DRYER-8 BLOWER", "TOWER ELEVATOR-15",
        "DRYER-1 TO 4 UNLOADING BELT CONVEYOR-7", "DRYER UNLOADING ELEVATOR-17", "FINAL SILO ELEVATOR-16",
        "CHAIN CONVEYOR-2", "BELT CONVEYOR-8", "CLEANING PUMP",
      ],
      "Silo / Bin Section": ["Silo -1", "Silo -2", "Silo -3", "Silo -4", "Socking bin", "ONC Bin"],
    },
  },
  Boiler: {
    sections: ["Utility Section", "Boiler Section", "WTP Section"],
    items: {
      "Utility Section": ["General", "Electric supply", "Water", "Compressor Air", "CRS", "Steam Line"],
      "Boiler Section": [
        "Electrical Panel", "ID Fan", "FD Fan - 1", "FD Fan - 2", "Feed Water Pump - 1", "Feed Water Pump - 2",
        "Feed Water Pump - 3", "Booster Fan - 1", "Booster Fan - 2", "Hopper Airlock", "Cyclomax Airlock",
        "APH Airlock", "Husk Feeder -1", "Husk Feeder -2", "Screw Feeder - 1", "Screw Feeder - 2",
        "Husk Elevator", "Air Compressor", "Sand Filter Motor - 1", "Sand Filter Motor - 2",
      ],
      "WTP Section": [
        "Electrical Panel", "Salt Mixer", "Softner Pump - 1", "Softner Pump - 2", "Raw Water Tank Pump - 1",
        "Raw Water Tank Pump - 2", "Hot Water Tank Pump -1", "Hot Water Tank Pump -2", "Hot Water Tank Pump -3",
        "Softner Tank Pump - 1",
      ],
    },
  },
  ETP: {
    sections: ["Utility Section", "ETP Section"],
    items: {
      "Utility Section": ["General", "Electric supply", "Water", "Compressor Air", "CRS", "Steam Line"],
      "ETP Section": [
        "Electrical Panel", "Raw Effluent Transfer Pump-1 (RETP-1)", "Raw Effluent Transfer Pump-2 (RETP-2)",
        "Coagulant Dosing Pump-1 (CDS-1)", "Coagulant Dosing Pump-2 (CDS-2)", "Coagulant Dosing Pump-3 (CDS-3)",
        "Coagulant Dosing Pump-4 (CDS-4)", "Polymer Dosing Pump-1 (FDC-1)", "Polymer Dosing Pump-2 (FDC-2)",
        "Polymer Dosing Pump-2 (FDC-3)", "Polymer Dosing Pump-2 (FDC-4)", "Hypo Dosing Pump-1",
        "Hypo Dosing Pump-2", "Air Blower For AQT-1 (EQT-1)", "Air Blower For AQT-2 (EQT-2)",
        "Filter Feed Pump-1", "Filter Feed Pump-2", "Air Blower For AA-1 (EQT-3)", "Air Blower For AA-2 (EQT-4)",
      ],
    },
  },
  Powerhouse: {
    sections: ["Powerhouse Section"],
    items: {
      "Powerhouse Section": [
        "Electrical Panel", "AIR Compressor E75 - 1", "AIR Compressor E75 - 2", "AIR Compressor E75 - 3",
        "AIR Compressor E55 - 1", "Air Dryer - 1", "Air Dryer - 2", "Air Dryer - 3", "Milling DG",
        "Parboiling DG", "Admin DG", "33/11KV Transformer", "11/0.415 KV Transformer", "NEPA Gride",
        "Diesel Storage",
      ],
    },
  },
  Admin: {
    sections: ["Utility Section", "Admin Section"],
    items: {
      "Utility Section": ["General", "Electric supply", "Water"],
      "Admin Section": [
        "Admin/Residency", "HR Office", "Technical store", "Masque", "REKA Storage", "Security gate - 1",
        "Security gate - 2", "Canteen", "WeighBridge", "Staff Rest Room",
      ],
    },
  },
};

export const PLANTS = Object.keys(PLANT_TREE);

function withGeneral(list) {
  return list.includes("General") ? list : [...list, "General"];
}

export function sectionsForPlant(plant) {
  return withGeneral(PLANT_TREE[plant]?.sections ?? []);
}

export function equipmentForSection(plant, section) {
  return withGeneral(PLANT_TREE[plant]?.items?.[section] ?? []);
}

// Staff who can be recorded under "Attended by".
export const STAFF = [
  { name: "Danjuma Peter", designation: "Ele Supervisor" },
  { name: "Lucky", designation: "Sr. Electrician" },
  { name: "Anthony I. Amedu", designation: "Sr. Electrician" },
  { name: "Bakari Lawal", designation: "Sr. Electrician" },
  { name: "Bitrus Yunusa", designation: "Electrician" },
  { name: "Saleh Haruna", designation: "Electrician" },
  { name: "Abdulmajid Abdulraham", designation: "Electrician" },
  { name: "Anthony Inuwa", designation: "Electrician" },
  { name: "Joseph F Matthew", designation: "Electrician" },
  { name: "Daniel Okechukwu", designation: "Electrician" },
  { name: "Gideon Micah", designation: "Gen Operator" },
  { name: "James", designation: "Gen Operator" },
  { name: "Joseph Peter", designation: "Gen Operator" },
];

export const STAFF_NAMES = STAFF.map((s) => s.name);

export const MAINTENANCE_TYPES = [
  { value: "PREVENTIVE", label: "Preventive", description: "Scheduled / routine check" },
  { value: "BREAKDOWN", label: "Breakdown", description: "Unplanned failure" },
  { value: "PROJECT", label: "Project", description: "New install / upgrade work" },
  { value: "IMPROVEMENT", label: "Improvement", description: "Modification / optimisation" },
];

export const MAINTENANCE_TYPE_VALUES = MAINTENANCE_TYPES.map((t) => t.value);

export function maintenanceTypeLabel(value) {
  return MAINTENANCE_TYPES.find((t) => t.value === value)?.label ?? value;
}

// "09:00" / "10:30" -> 90 (minutes), wrapping past midnight if end < start.
export function durationMinutes(startTime, endTime) {
  const [sh, sm] = String(startTime).split(":").map(Number);
  const [eh, em] = String(endTime).split(":").map(Number);
  if (![sh, sm, eh, em].every(Number.isFinite)) return null;
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

export function formatDuration(mins) {
  if (mins == null || !Number.isFinite(mins)) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return (h ? `${h}h ` : "") + `${m}m`;
}

export function isValidTimeStr(s) {
  return typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}
