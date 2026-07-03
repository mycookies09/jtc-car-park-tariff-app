import React, { useState, useMemo, useEffect, useRef } from "react";
import { openOrInitDb, readState, writeState, persist, exportBytes, createDb, fetchSeedDb } from "./db";

const NL = String.fromCharCode(10);

const DEFAULT_USERS = [
  { userId: "fem", password: "P@ssw0rd1", role: "user", mustChangePassword: true },
  { userId: "admin", password: "admin", role: "admin", mustChangePassword: true },
];

const SEED_DB_URL = import.meta.env.BASE_URL + "data/jtc-car-park-tariff.sqlite";

const COLORS = {
  primary: "#0057B8",
  primaryHover: "#00408A",
  teal: "#00A3A3",
  bg: "#F4F7FB",
  panel: "#EDF5FF",
  border: "#CBD9EC",
  text: "#1C2B3A",
  muted: "#5A6B7E",
  danger: "#B3261E",
  success: "#0F6E56",
};

const VEHICLE_TYPES = ["C - Car", "M - Motorcycle", "H - Heavy Vehicle"];
const MODES = [
  "Short-term rate",
  "Day Capped rate (if any)",
  "Night Capped rate (if any)",
];

const DAY_CODE_MAP = [
  { code: 1, label: "Monday", src: "monFri" },
  { code: 2, label: "Tuesday", src: "monFri" },
  { code: 3, label: "Wednesday", src: "monFri" },
  { code: 4, label: "Thursday", src: "monFri" },
  { code: 5, label: "Friday", src: "monFri" },
  { code: 6, label: "Saturday", src: "sat" },
  { code: 7, label: "Sunday / Public Holiday", src: "sunPh" },
];

const SEED_TARIFFS = [
  {
    tariffId: "JTCC001",
    vehicleType: "C - Car",
    rows: [
      { opHours: "0700 to 0700 (24hours)", mode: "Short-term rate", monFri: "No scheme", sat: "No scheme", sunPh: "No scheme" },
      { opHours: "0700 to 0700 (24hours)", mode: "Day Capped rate (if any)", monFri: "No scheme", sat: "No scheme", sunPh: "No scheme" },
      { opHours: "0700 to 0700 (24hours)", mode: "Short-term rate", monFri: "No scheme", sat: "No scheme", sunPh: "No scheme" },
      { opHours: "0700 to 0700 (24hours)", mode: "Night Capped rate (if any)", monFri: "No scheme", sat: "No scheme", sunPh: "No scheme" },
    ],
  },
  {
    tariffId: "JTCM001",
    vehicleType: "M - Motorcycle",
    rows: [
      { opHours: "0700 to 0700 (24hours)", mode: "Short-term rate", monFri: "No scheme", sat: "No scheme", sunPh: "No scheme" },
      { opHours: "0700 to 0700 (24hours)", mode: "Day Capped rate (if any)", monFri: "No scheme", sat: "No scheme", sunPh: "No scheme" },
      { opHours: "0700 to 0700 (24hours)", mode: "Short-term rate", monFri: "No scheme", sat: "No scheme", sunPh: "No scheme" },
      { opHours: "0700 to 0700 (24hours)", mode: "Night Capped rate (if any)", monFri: "No scheme", sat: "No scheme", sunPh: "No scheme" },
    ],
  },
  {
    tariffId: "JTCH001",
    vehicleType: "H - Heavy Vehicle",
    rows: [
      { opHours: "0700 to 0700 (24hours)", mode: "Short-term rate", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
      { opHours: "0700 to 0700 (24hours)", mode: "Day Capped rate (if any)", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
      { opHours: "0700 to 0700 (24hours)", mode: "Short-term rate", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
      { opHours: "0700 to 0700 (24hours)", mode: "Night Capped rate (if any)", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
    ],
  },
  {
    tariffId: "JTCC002",
    vehicleType: "C - Car",
    rows: [
      { opHours: "0700 to 2230", mode: "Short-term rate", monFri: "60c/ 30min", sat: "60c/30min", sunPh: "Free Parking" },
      { opHours: "0700 to 2230", mode: "Day Capped rate (if any)", monFri: "12", sat: "12", sunPh: "Free Parking" },
      { opHours: "2230 to 0700", mode: "Short-term rate", monFri: "60c/ 30min", sat: "60c/30min", sunPh: "60c/30min" },
      { opHours: "2230 to 0700", mode: "Night Capped rate (if any)", monFri: "5", sat: "5", sunPh: "5" },
    ],
  },
  {
    tariffId: "JTCM002",
    vehicleType: "M - Motorcycle",
    rows: [
      { opHours: "0700 to 2230", mode: "Short-term rate", monFri: "0.10/30min", sat: "0.10/30min", sunPh: "Free Parking" },
      { opHours: "0700 to 2230", mode: "Day Capped rate (if any)", monFri: "65c/ day", sat: "65c/ day", sunPh: "Free Parking" },
      { opHours: "2230 to 0700", mode: "Short-term rate", monFri: "0.10/30min", sat: "0.10/30min", sunPh: "0.10/30min" },
      { opHours: "2230 to 0700", mode: "Night Capped rate (if any)", monFri: "65c/ day", sat: "65c/ day", sunPh: "65c/ day" },
    ],
  },
  {
    tariffId: "JTCC003",
    vehicleType: "C - Car",
    rows: [
      { opHours: "0700 to 2230", mode: "Short-term rate", monFri: "60c/ 30min", sat: "60c/30min", sunPh: "Free Parking" },
      { opHours: "0700 to 2230", mode: "Day Capped rate (if any)", monFri: "12", sat: "12", sunPh: "Free Parking" },
      { opHours: "2230 to 0700", mode: "Short-term rate", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "60c/30min" },
      { opHours: "2230 to 0700", mode: "Night Capped rate (if any)", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "5" },
    ],
  },
  {
    tariffId: "JTCH002",
    vehicleType: "H - Heavy Vehicle",
    rows: [
      { opHours: "0700 to 2230", mode: "Short-term rate", monFri: "120c/ 30min", sat: "120c/ 30min", sunPh: "Free Parking" },
      { opHours: "0700 to 2230", mode: "Day Capped rate (if any)", monFri: "24", sat: "24", sunPh: "Free Parking" },
      { opHours: "2230 to 0700", mode: "Short-term rate", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
      { opHours: "2230 to 0700", mode: "Night Capped rate (if any)", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
    ],
  },
  {
    tariffId: "JTCC004",
    vehicleType: "C - Car",
    rows: [
      { opHours: "0700 to 2230", mode: "Short-term rate", monFri: "60c/ 30min", sat: "60c/30min", sunPh: "60c/30min" },
      { opHours: "0700 to 2230", mode: "Day Capped rate (if any)", monFri: "12", sat: "12", sunPh: "12" },
      { opHours: "2230 to 0700", mode: "Short-term rate", monFri: "60c/ 30min", sat: "60c/30min", sunPh: "60c/30min" },
      { opHours: "2230 to 0700", mode: "Night Capped rate (if any)", monFri: "5", sat: "5", sunPh: "5" },
    ],
  },
  {
    tariffId: "JTCM003",
    vehicleType: "M - Motorcycle",
    rows: [
      { opHours: "0700 to 2230", mode: "Short-term rate", monFri: "0.10/30min", sat: "0.10/30min", sunPh: "0.10/30min" },
      { opHours: "0700 to 2230", mode: "Day Capped rate (if any)", monFri: "65c/ day", sat: "65c/ day", sunPh: "65c/ day" },
      { opHours: "2230 to 0700", mode: "Short-term rate", monFri: "0.10/30min", sat: "0.10/30min", sunPh: "0.10/30min" },
      { opHours: "2230 to 0700", mode: "Night Capped rate (if any)", monFri: "65c/ day", sat: "65c/ day", sunPh: "65c/ day" },
    ],
  },
  {
    tariffId: "JTCH003",
    vehicleType: "H - Heavy Vehicle",
    rows: [
      { opHours: "0700 to 2230", mode: "Short-term rate", monFri: "120c/ 30min", sat: "120c/ 30min", sunPh: "120c/ 30min" },
      { opHours: "0700 to 2230", mode: "Day Capped rate (if any)", monFri: "24", sat: "24", sunPh: "24" },
      { opHours: "2230 to 0700", mode: "Short-term rate", monFri: "120c/ 30min", sat: "120c/ 30min", sunPh: "120c/ 30min" },
      { opHours: "2230 to 0700", mode: "Night Capped rate (if any)", monFri: "10", sat: "10", sunPh: "10" },
    ],
  },
  {
    tariffId: "JTCH004",
    vehicleType: "H - Heavy Vehicle",
    rows: [
      { opHours: "0700 to 2230", mode: "Short-term rate", monFri: "120c/ 30min", sat: "120c/ 30min", sunPh: "Free Parking" },
      { opHours: "0700 to 2230", mode: "Day Capped rate (if any)", monFri: "24", sat: "24", sunPh: "Free Parking" },
      { opHours: "2230 to 0700", mode: "Short-term rate", monFri: "120c/ 30min", sat: "120c/ 30min", sunPh: "120c/ 30min" },
      { opHours: "2230 to 0700", mode: "Night Capped rate (if any)", monFri: "10", sat: "10", sunPh: "10" },
    ],
  },
  {
    tariffId: "JTCM004",
    vehicleType: "M - Motorcycle",
    rows: [
      { opHours: "0700 to 2230", mode: "Short-term rate", monFri: "0.10/30min", sat: "0.10/30min", sunPh: "Free Parking" },
      { opHours: "0700 to 2230", mode: "Day Capped rate (if any)", monFri: "65c/ day", sat: "65c/ day", sunPh: "Free Parking" },
      { opHours: "2230 to 0700", mode: "Short-term rate", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "65c/ day" },
      { opHours: "2230 to 0700", mode: "Night Capped rate (if any)", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "65c/ day" },
    ],
  },
  {
    tariffId: "JTCH005",
    vehicleType: "H - Heavy Vehicle",
    rows: [
      { opHours: "0730 to 1900", mode: "Short-term rate", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
      { opHours: "0730 to 1900", mode: "Day Capped rate (if any)", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
      { opHours: "1900 to 0730", mode: "Short-term rate", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
      { opHours: "1900 to 0730", mode: "Night Capped rate (if any)", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
    ],
  },
  {
    tariffId: "JTCC005",
    vehicleType: "C - Car",
    rows: [
      { opHours: "0700 to 2230", mode: "Short-term rate", monFri: "60c/ 30min", sat: "60c/30min", sunPh: "Free Parking" },
      { opHours: "0700 to 2230", mode: "Day Capped rate (if any)", monFri: "12", sat: "12", sunPh: "Free Parking" },
      { opHours: "2230 to 0700", mode: "Short-term rate", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
      { opHours: "2230 to 0700", mode: "Night Capped rate (if any)", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
    ],
  },
  {
    tariffId: "JTCM005",
    vehicleType: "M - Motorcycle",
    rows: [
      { opHours: "0700 to 2230", mode: "Short-term rate", monFri: "0.10/30min", sat: "0.10/30min", sunPh: "Free Parking" },
      { opHours: "0700 to 2230", mode: "Day Capped rate (if any)", monFri: "65c/ day", sat: "65c/ day", sunPh: "Free Parking" },
      { opHours: "2230 to 0700", mode: "Short-term rate", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
      { opHours: "2230 to 0700", mode: "Night Capped rate (if any)", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
    ],
  },
  {
    tariffId: "JTCC006",
    vehicleType: "C - Car",
    rows: [
      { opHours: "0700 to 2230", mode: "Short-term rate", monFri: "60c/ 30min", sat: "60c/30min", sunPh: "60c/30min" },
      { opHours: "0700 to 2230", mode: "Day Capped rate (if any)", monFri: "12", sat: "12", sunPh: "12" },
      { opHours: "2230 to 0700", mode: "Short-term rate", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
      { opHours: "2230 to 0700", mode: "Night Capped rate (if any)", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
    ],
  },
  {
    tariffId: "JTCH006",
    vehicleType: "H - Heavy Vehicle",
    rows: [
      { opHours: "0700 to 2230", mode: "Short-term rate", monFri: "120c/ 30min", sat: "120c/ 30min", sunPh: "120c/ 30min" },
      { opHours: "0700 to 2230", mode: "Day Capped rate (if any)", monFri: "24", sat: "24", sunPh: "24" },
      { opHours: "2230 to 0700", mode: "Short-term rate", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
      { opHours: "2230 to 0700", mode: "Night Capped rate (if any)", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
    ],
  },
  {
    tariffId: "JTCM006",
    vehicleType: "M - Motorcycle",
    rows: [
      { opHours: "0700 to 2230", mode: "Short-term rate", monFri: "0.10/30min", sat: "0.10/30min", sunPh: "0.10/30min" },
      { opHours: "0700 to 2230", mode: "Day Capped rate (if any)", monFri: "65c/ day", sat: "65c/ day", sunPh: "65c/ day" },
      { opHours: "2230 to 0700", mode: "Short-term rate", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
      { opHours: "2230 to 0700", mode: "Night Capped rate (if any)", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
    ],
  },
  {
    tariffId: "JTCH007",
    vehicleType: "H - Heavy Vehicle",
    rows: [
      { opHours: "0700 to 2230", mode: "Short-term rate", monFri: "120c/ 30min", sat: "120c/ 30min", sunPh: "Reserved Parking" },
      { opHours: "0700 to 2230", mode: "Day Capped rate (if any)", monFri: "24", sat: "24", sunPh: "Reserved Parking" },
      { opHours: "2230 to 0700", mode: "Short-term rate", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
      { opHours: "2230 to 0700", mode: "Night Capped rate (if any)", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
    ],
  },
  {
    tariffId: "JTCH008",
    vehicleType: "H - Heavy Vehicle",
    rows: [
      { opHours: "0700 to 1900", mode: "Short-term rate", monFri: "120c/ 30min", sat: "120c/ 30min", sunPh: "Reserved Parking" },
      { opHours: "0700 to 1900", mode: "Day Capped rate (if any)", monFri: "24", sat: "24", sunPh: "Reserved Parking" },
      { opHours: "1900 to 0700", mode: "Short-term rate", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
      { opHours: "1900 to 0700", mode: "Night Capped rate (if any)", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
    ],
  },
  {
    tariffId: "JTCH009",
    vehicleType: "H - Heavy Vehicle",
    rows: [
      { opHours: "0730 to 1900", mode: "Short-term rate", monFri: "120c/ 30min", sat: "120c/ 30min", sunPh: "Reserved Parking" },
      { opHours: "0730 to 1900", mode: "Day Capped rate (if any)", monFri: "24", sat: "24", sunPh: "Reserved Parking" },
      { opHours: "1900 to 0730", mode: "Short-term rate", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
      { opHours: "1900 to 0730", mode: "Night Capped rate (if any)", monFri: "Reserved Parking", sat: "Reserved Parking", sunPh: "Reserved Parking" },
    ],
  },
];

const SEED_CAR_PARKS = [
  { carParkNo: "AK83", address: "BLK 5022 TO 5095 Ang Mo Kio Industrial Park 2 (heavy vehicle only)", tariffCar: "JTCC001", tariffMc: "JTCM001", tariffHv: "JTCH001" },
  { carParkNo: "A83", address: "BLK 5022 TO 5095 Ang Mo Kio Industrial Park 2", tariffCar: "JTCC002", tariffMc: "JTCM002", tariffHv: "JTCH001" },
  { carParkNo: "A86", address: "BLK 4001-4003/4026-4028/ Ang Mo Kio Industrial Park 1", tariffCar: "JTCC003", tariffMc: "JTCM002", tariffHv: "JTCH002" },
  { carParkNo: "AV2", address: "BLK 1001/1010 Alexandra Village Industrial Park", tariffCar: "JTCC004", tariffMc: "JTCM003", tariffHv: "JTCH003" },
  { carParkNo: "TB27", address: "BLK 4001- 4008 Depot Lane Industrial Park", tariffCar: "JTCC002", tariffMc: "JTCM002", tariffHv: "JTCH004" },
  { carParkNo: "EI1", address: "BLK 1001- 1085 Eunos Industrial Estate", tariffCar: "JTCC003", tariffMc: "JTCM004", tariffHv: "JTCH002" },
  { carParkNo: "GE1D", address: "BLK 1005 - 1012 Aljunied Ave Industrial Park", tariffCar: "JTCC002", tariffMc: "JTCM002", tariffHv: "JTCH005" },
  { carParkNo: "KU5", address: "BLK 3004-3007, Ubi Industrial Estate", tariffCar: "JTCC005", tariffMc: "JTCM005", tariffHv: "" },
  { carParkNo: "UBA4", address: "Ubi Avenue 4", tariffCar: "JTCC005", tariffMc: "JTCM005", tariffHv: "" },
  { carParkNo: "HG40", address: "BLK 1 TO 32, 37 TO 38 DEFU LANE 10 Defu Industrial Estate (Defu Lane 10)", tariffCar: "JTCC002", tariffMc: "JTCM002", tariffHv: "JTCH002" },
  { carParkNo: "HG57", address: "DEFU LANE 7 Defu Industrial Estate (Defu Lane 7)", tariffCar: "JTCC006", tariffMc: "", tariffHv: "JTCH006" },
  { carParkNo: "HG58", address: "DEFU LANE 8 Defu Industrial Estate (Defu Lane 8)", tariffCar: "JTCC006", tariffMc: "", tariffHv: "JTCH006" },
  { carParkNo: "HG59", address: "DEFU LANE 9 Defu Industrial Estate (Defu Lane 9)", tariffCar: "JTCC006", tariffMc: "", tariffHv: "JTCH006" },
  { carParkNo: "HG65", address: "DEFU LANE 11 Defu Industrial Estate (Defu Lane 11)", tariffCar: "JTCC006", tariffMc: "", tariffHv: "JTCH006" },
  { carParkNo: "HG66", address: "DEFU LANE 12 Defu Industrial Estate (Defu Lane 12)", tariffCar: "JTCC006", tariffMc: "", tariffHv: "JTCH006" },
  { carParkNo: "HG81", address: "DEFU LANE 1 Defu Industrial Estate (Defu Lane 1)", tariffCar: "JTCC006", tariffMc: "JTCM006", tariffHv: "JTCH006" },
  { carParkNo: "HG82", address: "DEFU LANE 2 Defu Industrial Estate (Defu Lane 2)", tariffCar: "JTCC006", tariffMc: "JTCM006", tariffHv: "JTCH006" },
  { carParkNo: "HG83", address: "DEFU LANE 3 Defu Industrial Estate (Defu Lane 3)", tariffCar: "JTCC006", tariffMc: "JTCM006", tariffHv: "JTCH006" },
  { carParkNo: "HG84", address: "DEFU LANE 5 Defu Industrial Estate (Defu Lane 5)", tariffCar: "JTCC006", tariffMc: "JTCM006", tariffHv: "JTCH006" },
  { carParkNo: "HG85", address: "DEFU LANE 6 Defu Industrial Estate (Defu Lane 6)", tariffCar: "JTCC006", tariffMc: "JTCM006", tariffHv: "JTCH006" },
  { carParkNo: "Y22", address: "BLK 1001/1019,1023/1024 Yishun Industrial Park A", tariffCar: "JTCC005", tariffMc: "JTCM005", tariffHv: "JTCH002" },
  { carParkNo: "KB6", address: "BLK 74/92 Geylang Bahru Industrial Estate", tariffCar: "JTCC002", tariffMc: "JTCM002", tariffHv: "JTCH007" },
  { carParkNo: "TP56", address: "BLK 1 TO 21 Toa Payoh Industrial Park", tariffCar: "JTCC002", tariffMc: "JTCM002", tariffHv: "" },
  { carParkNo: "TP57", address: "BLK 1002 TO 1004 Toa Payoh Industrial Park", tariffCar: "JTCC002", tariffMc: "JTCM002", tariffHv: "" },
  { carParkNo: "TP59", address: "BLK 1003/1004 Toa Payoh Industrial Park", tariffCar: "JTCC002", tariffMc: "JTCM002", tariffHv: "JTCH002" },
  { carParkNo: "W16", address: "Marsiling Industrial Estate", tariffCar: "JTCC005", tariffMc: "JTCM005", tariffHv: "JTCH002" },
  { carParkNo: "W47", address: "Woodlands Industrial Park E", tariffCar: "JTCC006", tariffMc: "", tariffHv: "JTCH008" },
  { carParkNo: "SM5", address: "Blk 1,7-10 and Blk 28-33, 36 Sin Ming Industrial Estate", tariffCar: "JTCC005", tariffMc: "JTCM005", tariffHv: "JTCH009" },
];

function newRow() {
  return { opHours: "", mode: "Short-term rate", monFri: "", sat: "", sunPh: "" };
}

function csvCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  if (s.indexOf(",") !== -1 || s.indexOf('"') !== -1 || s.indexOf(NL) !== -1) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(",")).join(NL);
}

function downloadCsv(filename, rows) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseTime(part) {
  const raw = (part || "").trim();
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 0) return { ok: false, raw };
  let v = parseInt(digits, 10);
  if (digits.length <= 2) v = v * 100;
  return { ok: true, value: v, raw };
}

function normaliseBand(opHours) {
  const text = (opHours || "").toLowerCase();
  const sep = text.indexOf(" to ");
  if (sep === -1) return { from: opHours || "", to: "" };
  const fromPart = opHours.slice(0, sep);
  const toPart = opHours.slice(sep + 4);
  const f = parseTime(fromPart);
  const t = parseTime(toPart);
  if (!f.ok || !t.ok) return { from: (fromPart || "").trim(), to: (toPart || "").trim() };
  let toVal = t.value;
  if (toVal <= f.value) toVal += 2400;
  const pad = (n) => String(n).padStart(4, "0");
  return { from: pad(f.value), to: pad(toVal) };
}

function metadataKey(tariff) {
  const rowsKey = tariff.rows
    .map((r) =>
      [r.opHours, r.mode, r.monFri, r.sat, r.sunPh].map((x) => (x || "").trim()).join("\u241F")
    )
    .join("\u2502");
  return (tariff.vehicleType || "").trim() + "\u2016" + rowsKey;
}

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid " + COLORS.border,
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
  background: "#fff",
  color: COLORS.text,
};

const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: COLORS.muted, marginBottom: 4 };

function Button({ children, onClick, variant, disabled, style }) {
  const base = {
    padding: "9px 16px",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    border: "1px solid transparent",
    opacity: disabled ? 0.55 : 1,
    transition: "background 0.15s",
  };
  const variants = {
    primary: { background: COLORS.primary, color: "#fff" },
    teal: { background: COLORS.teal, color: "#fff" },
    ghost: { background: "#fff", color: COLORS.primary, border: "1px solid " + COLORS.border },
    danger: { background: "#fff", color: COLORS.danger, border: "1px solid " + COLORS.danger },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ ...base, ...(variants[variant] || variants.primary), ...style }}
    >
      {children}
    </button>
  );
}

function Banner({ kind, children, onClose }) {
  if (!children) return null;
  const palette = {
    error: { bg: "#FCEDEC", border: COLORS.danger, color: "#7A1A15" },
    success: { bg: "#E5F4EF", border: COLORS.success, color: "#0A4534" },
    warn: { bg: "#FFF6E5", border: "#B9821B", color: "#6B4A0C" },
  };
  const p = palette[kind] || palette.success;
  return (
    <div style={{ background: p.bg, border: "1px solid " + p.border, color: p.color, borderRadius: 6, padding: "10px 12px", fontSize: 13.5, marginBottom: 14, display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ whiteSpace: "pre-wrap" }}>{children}</span>
      {onClose ? <span onClick={onClose} style={{ cursor: "pointer", fontWeight: 700 }}>×</span> : null}
    </div>
  );
}

function LoginPage({ users, onLogin }) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit() {
    const u = users.find((x) => x.userId.toLowerCase() === userId.trim().toLowerCase());
    if (!u || u.password !== password) {
      setError("Incorrect user ID or password.");
      return;
    }
    setError("");
    onLogin(u);
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 380, background: "#fff", borderRadius: 12, border: "1px solid " + COLORS.border, padding: 28, boxShadow: "0 4px 18px rgba(0,40,90,0.08)" }}>
        <div style={{ height: 6, width: 48, background: COLORS.teal, borderRadius: 3, marginBottom: 18 }} />
        <h1 style={{ fontSize: 20, color: COLORS.primary, margin: "0 0 4px" }}>JTC Car Park Tariff</h1>
        <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 20px" }}>Tariff management MVP. Sign in to continue.</p>
        <Banner kind="error" onClose={() => setError("")}>{error}</Banner>
        <label style={labelStyle}>User ID</label>
        <input style={inputStyle} value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="fem" />
        <div style={{ height: 14 }} />
        <label style={labelStyle}>Password</label>
        <input type="password" style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} placeholder="••••••••" />
        <div style={{ height: 20 }} />
        <Button onClick={submit} style={{ width: "100%" }}>Sign in</Button>
      </div>
    </div>
  );
}

function ForceChangePasswordPage({ currentUser, setUsers, setCurrentUser }) {
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (!newPw.trim()) { setError("Enter a new password."); return; }
    if (newPw === currentUser.password) { setError("New password must be different from your current password."); return; }
    if (newPw !== confirmPw) { setError("Passwords do not match."); return; }
    const updated = { ...currentUser, password: newPw, mustChangePassword: false };
    setUsers((prev) => prev.map((u) => (u.userId === currentUser.userId ? updated : u)));
    setCurrentUser(updated);
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 380, background: "#fff", borderRadius: 12, border: "1px solid " + COLORS.border, padding: 28, boxShadow: "0 4px 18px rgba(0,40,90,0.08)" }}>
        <div style={{ height: 6, width: 48, background: COLORS.teal, borderRadius: 3, marginBottom: 18 }} />
        <h1 style={{ fontSize: 20, color: COLORS.primary, margin: "0 0 4px" }}>Set a new password</h1>
        <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 20px" }}>This is your first sign-in. Choose a new password before continuing.</p>
        <Banner kind="error" onClose={() => setError("")}>{error}</Banner>
        <label style={labelStyle}>New password</label>
        <input type="password" style={inputStyle} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
        <div style={{ height: 14 }} />
        <label style={labelStyle}>Confirm new password</label>
        <input type="password" style={inputStyle} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
        <div style={{ height: 20 }} />
        <Button onClick={submit} style={{ width: "100%" }}>Set password &amp; continue</Button>
      </div>
    </div>
  );
}

function TariffPage({ tariffs, setTariffs, carParks }) {
  const [tariffId, setTariffId] = useState("");
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[0]);
  const [rows, setRows] = useState([newRow()]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warn, setWarn] = useState("");

  function resetForm() {
    setTariffId("");
    setVehicleType(VEHICLE_TYPES[0]);
    setRows([newRow()]);
    setEditingId(null);
    setWarn("");
  }

  function updateRow(idx, field, value) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function assignedCount(id) {
    return carParks.filter((c) => c.tariffCar === id || c.tariffMc === id || c.tariffHv === id).length;
  }

  function loadForEdit(t) {
    setEditingId(t.tariffId);
    setTariffId(t.tariffId);
    setVehicleType(t.vehicleType);
    setRows(t.rows.map((r) => ({ ...r })));
    setError("");
    setSuccess("");
    const n = assignedCount(t.tariffId);
    setWarn(n > 0 ? "This tariff is assigned to " + n + " car parks. Saving will affect all linked car parks." : "");
  }

  function save() {
    setError("");
    setSuccess("");
    const id = tariffId.trim();
    if (!id) { setError("Enter a Tariff ID before saving."); return; }
    if (rows.length === 0) { setError("Add at least one tariff row before saving."); return; }

    const candidate = { tariffId: id, vehicleType, rows: rows.map((r) => ({ ...r })) };

    if (editingId === null) {
      if (tariffs.some((t) => t.tariffId.toLowerCase() === id.toLowerCase())) {
        setError("Tariff ID '" + id + "' already exists. Tariff ID must be unique.");
        return;
      }
    } else if (editingId.toLowerCase() !== id.toLowerCase() && tariffs.some((t) => t.tariffId.toLowerCase() === id.toLowerCase())) {
      setError("Tariff ID '" + id + "' already exists. Tariff ID must be unique.");
      return;
    }

    const candidateKey = metadataKey(candidate);
    const dup = tariffs.find((t) => t.tariffId !== editingId && metadataKey(t) === candidateKey);
    if (dup) {
      setError("An identical tariff already exists under Tariff ID '" + dup.tariffId + "'. Please reuse the existing tariff instead of creating a duplicate.");
      return;
    }

    if (editingId === null) {
      setTariffs((prev) => [...prev, candidate]);
      setSuccess("Tariff '" + id + "' created.");
    } else {
      setTariffs((prev) => prev.map((t) => (t.tariffId === editingId ? candidate : t)));
      setSuccess("Tariff '" + id + "' updated.");
    }
    resetForm();
  }

  function removeTariff(id) {
    setTariffs((prev) => prev.filter((t) => t.tariffId !== id));
    if (editingId === id) resetForm();
  }

  const cellStyle = { padding: "6px", border: "1px solid " + COLORS.border, fontSize: 13 };

  return (
    <div>
      <h2 style={{ fontSize: 18, color: COLORS.primary, margin: "0 0 4px" }}>{editingId === null ? "Create tariff" : "Edit tariff — " + editingId}</h2>
      <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 18px" }}>Tariff ID is free-typed and must be unique. Each tariff holds one or more schedule rows.</p>

      <Banner kind="error" onClose={() => setError("")}>{error}</Banner>
      <Banner kind="success" onClose={() => setSuccess("")}>{success}</Banner>
      <Banner kind="warn" onClose={() => setWarn("")}>{warn}</Banner>

      <div style={{ background: COLORS.panel, borderRadius: 10, padding: 18, marginBottom: 22 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ flex: "1 1 220px" }}>
            <label style={labelStyle}>Tariff ID (primary key)</label>
            <input style={inputStyle} value={tariffId} onChange={(e) => setTariffId(e.target.value)} placeholder="e.g. CAR-AMK-01" disabled={editingId !== null} />
          </div>
          <div style={{ flex: "1 1 220px" }}>
            <label style={labelStyle}>Vehicle type</label>
            <select style={inputStyle} value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
              {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <label style={labelStyle}>Tariff schedule rows</label>
        <div style={{ overflowX: "auto", background: "#fff", borderRadius: 6, border: "1px solid " + COLORS.border }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 720 }}>
            <thead>
              <tr style={{ background: "#F0F5FC" }}>
                <th style={cellStyle}>Operating hours</th>
                <th style={cellStyle}>Mode of charges</th>
                <th style={cellStyle}>Mon - Fri</th>
                <th style={cellStyle}>Sat</th>
                <th style={cellStyle}>Sun / PH</th>
                <th style={cellStyle}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={cellStyle}><input style={{ ...inputStyle, padding: "6px 8px" }} value={r.opHours} onChange={(e) => updateRow(i, "opHours", e.target.value)} placeholder="0700 to 2230" /></td>
                  <td style={cellStyle}>
                    <select style={{ ...inputStyle, padding: "6px 8px" }} value={r.mode} onChange={(e) => updateRow(i, "mode", e.target.value)}>
                      {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td style={cellStyle}><input style={{ ...inputStyle, padding: "6px 8px" }} value={r.monFri} onChange={(e) => updateRow(i, "monFri", e.target.value)} placeholder="60c / 30min" /></td>
                  <td style={cellStyle}><input style={{ ...inputStyle, padding: "6px 8px" }} value={r.sat} onChange={(e) => updateRow(i, "sat", e.target.value)} /></td>
                  <td style={cellStyle}><input style={{ ...inputStyle, padding: "6px 8px" }} value={r.sunPh} onChange={(e) => updateRow(i, "sunPh", e.target.value)} /></td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    <span onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))} style={{ cursor: "pointer", color: COLORS.danger, fontWeight: 700 }} title="Remove row">×</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <Button variant="ghost" onClick={() => setRows((prev) => [...prev, newRow()])}>+ Add row</Button>
          <Button onClick={save}>{editingId === null ? "Save tariff" : "Save changes"}</Button>
          {editingId !== null ? <Button variant="ghost" onClick={resetForm}>Cancel edit</Button> : null}
        </div>
      </div>

      <h3 style={{ fontSize: 15, color: COLORS.text, margin: "0 0 10px" }}>Tariff master ({tariffs.length})</h3>
      {tariffs.length === 0 ? (
        <p style={{ fontSize: 13, color: COLORS.muted }}>No tariffs yet. Create one above.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {tariffs.map((t) => (
            <div key={t.tariffId} style={{ border: "1px solid " + COLORS.border, borderRadius: 8, padding: 12, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <span style={{ fontWeight: 700, color: COLORS.primary }}>{t.tariffId}</span>
                  <span style={{ fontSize: 12.5, color: COLORS.muted, marginLeft: 10 }}>{t.vehicleType} · {t.rows.length} row(s) · assigned to {assignedCount(t.tariffId)} car park(s)</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="ghost" onClick={() => loadForEdit(t)} style={{ padding: "6px 12px" }}>Edit</Button>
                  <Button variant="danger" onClick={() => removeTariff(t.tariffId)} style={{ padding: "6px 12px" }}>Delete</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CarParkPage({ tariffs, carParks, setCarParks }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedNo, setSelectedNo] = useState("");
  const [draft, setDraft] = useState({ tariffCar: "", tariffMc: "", tariffHv: "" });
  const [success, setSuccess] = useState("");
  const [outputType, setOutputType] = useState("URA Excel Output");

  const selected = carParks.find((c) => c.carParkNo === selectedNo);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return carParks;
    return carParks.filter((c) => c.carParkNo.toLowerCase().includes(q) || c.address.toLowerCase().includes(q));
  }, [search, carParks]);

  const carTariffs = tariffs.filter((t) => t.vehicleType === "C - Car");
  const mcTariffs = tariffs.filter((t) => t.vehicleType === "M - Motorcycle");
  const hvTariffs = tariffs.filter((t) => t.vehicleType === "H - Heavy Vehicle");

  function selectCarPark(c) {
    setSelectedNo(c.carParkNo);
    setSearch(c.carParkNo + " — " + c.address);
    setOpen(false);
    setDraft({ tariffCar: c.tariffCar || "", tariffMc: c.tariffMc || "", tariffHv: c.tariffHv || "" });
    setSuccess("");
  }

  function saveTagging() {
    setCarParks((prev) => prev.map((c) => (c.carParkNo === selectedNo ? { ...c, ...draft } : c)));
    setSuccess("Tagging saved for " + selectedNo + ".");
  }

  function tariffById(id) {
    return tariffs.find((t) => t.tariffId === id);
  }

  function buildUraRows() {
    const header = ["Record Type*", "Tariff ID*", "Vehicle Type", "Day Code*", "1 Op Hours From", "1 Op Hours To", "1 Amount", "1 Block", "2 Op Hours From", "2 Op Hours To", "2 Amount", "2 Block", "Day Capped At*", "Day Capped Start Time*", "Day Capped End Time*", "Overnight Capped at*", "Overnight Capped Start Time*", "Overnight Capped End Time*", "Parking Tariff Scheme*", "Effective Start Date*", "Effective End Date*", "Authority Code*"];
    const out = [header];
    carParks.forEach((cp) => {
      [cp.tariffCar, cp.tariffMc, cp.tariffHv].forEach((tid) => {
        if (!tid) return;
        const t = tariffById(tid);
        if (!t) return;
        const shortRows = t.rows.filter((r) => r.mode === "Short-term rate");
        const dayRow = t.rows.find((r) => r.mode === "Day Capped rate (if any)");
        const nightRow = t.rows.find((r) => r.mode === "Night Capped rate (if any)");
        const band1 = shortRows[0];
        const band2 = shortRows[1];
        const b1 = band1 ? normaliseBand(band1.opHours) : { from: "", to: "" };
        const b2 = band2 ? normaliseBand(band2.opHours) : { from: "", to: "" };
        const dayBand = dayRow ? normaliseBand(dayRow.opHours) : { from: "", to: "" };
        const nightBand = nightRow ? normaliseBand(nightRow.opHours) : { from: "", to: "" };
        DAY_CODE_MAP.forEach((dc) => {
          const amt1 = band1 ? band1[dc.src] : "";
          const amt2 = band2 ? band2[dc.src] : "";
          out.push([
            "D", t.tariffId, t.vehicleType, dc.code,
            b1.from, b1.to, amt1, "",
            b2.from, b2.to, amt2, "",
            dayRow ? dayRow[dc.src] : "", dayBand.from, dayBand.to,
            nightRow ? nightRow[dc.src] : "", nightBand.from, nightBand.to,
            "2 - Permanent Parking", "", "", "1 - URA",
          ]);
        });
      });
    });
    return out;
  }

  function buildCarParkInfoRows() {
    const header = ["Record Type*", "Effective Start Date*", "Effective End Date*", "Car Park Type*", "Car Park Name*", "Car Park ID*", "Car Park Group ID", "Tariff ID*", "Parking Grace Period*", "Authority Code*", "HDB Branch Code", "Car Park Agent ID*", "Filler*"];
    const out = [header];
    carParks.forEach((cp) => {
      [cp.tariffCar, cp.tariffMc, cp.tariffHv].forEach((tid) => {
        if (!tid) return;
        out.push(["D", "", "", "", cp.address, cp.carParkNo, "", tid, "Will align with URA", "1-URA", "", "", ""]);
      });
    });
    return out;
  }

  function buildTariffWithCarParkRows() {
    const header = ["Parking Place", "Tariff ID", "Vehicle Type", "Operating hours", "Mode of charges", "Mon - Fri", "Sat", "Sun / PH"];
    const out = [header];
    carParks.forEach((cp) => {
      const place = cp.address + " (" + cp.carParkNo + ")";
      [cp.tariffCar, cp.tariffMc, cp.tariffHv].forEach((tid) => {
        if (!tid) return;
        const t = tariffById(tid);
        if (!t) return;
        t.rows.forEach((r) => {
          out.push([place, t.tariffId, t.vehicleType, r.opHours, r.mode, r.monFri, r.sat, r.sunPh]);
        });
      });
    });
    return out;
  }

  function buildHourlyChargesRows() {
    const header = ["car_park_no", "address", "New Hourly Charges"];
    const out = [header];
    carParks.forEach((cp) => {
      const groups = [
        { label: "Car", tid: cp.tariffCar },
        { label: "Motorcycle", tid: cp.tariffMc },
        { label: "Heavy Vehicle", tid: cp.tariffHv },
      ];
      const lines = [];
      groups.forEach((g) => {
        lines.push(g.label);
        const t = g.tid ? tariffById(g.tid) : null;
        if (!t) {
          lines.push("Not Applicable");
        } else {
          t.rows.forEach((r) => {
            lines.push(r.opHours + " - " + (r.monFri || ""));
          });
        }
      });
      out.push([cp.carParkNo, cp.address, lines.join(NL)]);
    });
    return out;
  }

  function downloadOutput() {
    if (outputType === "URA Excel Output") downloadCsv("ura_excel_output.csv", buildUraRows());
    else if (outputType === "Car Park Info Output") downloadCsv("car_park_info_output.csv", buildCarParkInfoRows());
    else if (outputType === "Tariff with car park data") downloadCsv("tariff_with_car_park_data.csv", buildTariffWithCarParkRows());
    else if (outputType === "Car Park New Hourly Charges Output") downloadCsv("car_park_new_hourly_charges.csv", buildHourlyChargesRows());
  }

  const tariffSelect = (value, onChange, list, label) => (
    <div style={{ flex: "1 1 200px" }}>
      <label style={labelStyle}>{label}</label>
      <select style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— none —</option>
        {list.map((t) => <option key={t.tariffId} value={t.tariffId}>{t.tariffId}</option>)}
      </select>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: 18, color: COLORS.primary, margin: "0 0 4px" }}>Car park information & tariff tagging</h2>
      <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 18px" }}>Search a car park, tag one tariff per vehicle type, then download outputs.</p>

      <Banner kind="success" onClose={() => setSuccess("")}>{success}</Banner>

      <div style={{ background: COLORS.panel, borderRadius: 10, padding: 18, marginBottom: 22 }}>
        <label style={labelStyle}>Car park no. (search by number or address)</label>
        <div style={{ position: "relative" }}>
          <input
            style={inputStyle}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); setSelectedNo(""); }}
            onFocus={() => setOpen(true)}
            placeholder="Type AK83 or ANG MO KIO…"
          />
          {open && filtered.length > 0 ? (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid " + COLORS.border, borderRadius: 6, marginTop: 4, zIndex: 20, maxHeight: 220, overflowY: "auto", boxShadow: "0 6px 16px rgba(0,40,90,0.12)" }}>
              {filtered.map((c) => (
                <div key={c.carParkNo} onClick={() => selectCarPark(c)} style={{ padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid #EEF3F9" }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: COLORS.primary }}>{c.carParkNo}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted }}>{c.address}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {selected ? (
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Address / parking place</label>
            <div style={{ ...inputStyle, background: "#F4F7FB", color: COLORS.muted }}>{selected.address}</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
              {tariffSelect(draft.tariffCar, (v) => setDraft((d) => ({ ...d, tariffCar: v })), carTariffs, "Tariff for Car")}
              {tariffSelect(draft.tariffMc, (v) => setDraft((d) => ({ ...d, tariffMc: v })), mcTariffs, "Tariff for Motorcycle")}
              {tariffSelect(draft.tariffHv, (v) => setDraft((d) => ({ ...d, tariffHv: v })), hvTariffs, "Tariff for Heavy Vehicle")}
            </div>
            <div style={{ marginTop: 16 }}>
              <Button variant="teal" onClick={saveTagging}>Save tagging</Button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: COLORS.muted, marginTop: 14, marginBottom: 0 }}>Select a car park to tag tariffs.</p>
        )}
      </div>

      <h3 style={{ fontSize: 15, color: COLORS.text, margin: "0 0 10px" }}>Car park tagging overview</h3>
      <div style={{ overflowX: "auto", marginBottom: 26 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640, fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F0F5FC" }}>
              {["Car Park No", "Address / Parking Place", "Car", "Motorcycle", "Heavy Vehicle"].map((h) => (
                <th key={h} style={{ padding: "8px 10px", border: "1px solid " + COLORS.border, textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carParks.map((c) => (
              <tr key={c.carParkNo}>
                <td style={{ padding: "8px 10px", border: "1px solid " + COLORS.border, fontWeight: 600 }}>{c.carParkNo}</td>
                <td style={{ padding: "8px 10px", border: "1px solid " + COLORS.border }}>{c.address}</td>
                <td style={{ padding: "8px 10px", border: "1px solid " + COLORS.border, color: c.tariffCar ? COLORS.text : COLORS.muted }}>{c.tariffCar || "—"}</td>
                <td style={{ padding: "8px 10px", border: "1px solid " + COLORS.border, color: c.tariffMc ? COLORS.text : COLORS.muted }}>{c.tariffMc || "—"}</td>
                <td style={{ padding: "8px 10px", border: "1px solid " + COLORS.border, color: c.tariffHv ? COLORS.text : COLORS.muted }}>{c.tariffHv || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ background: COLORS.panel, borderRadius: 10, padding: 18 }}>
        <h3 style={{ fontSize: 15, color: COLORS.text, margin: "0 0 12px" }}>Download output</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 320px" }}>
            <label style={labelStyle}>Output type</label>
            <select style={inputStyle} value={outputType} onChange={(e) => setOutputType(e.target.value)}>
              <option>URA Excel Output</option>
              <option>Car Park Info Output</option>
              <option>Tariff with car park data</option>
              <option>Car Park New Hourly Charges Output</option>
            </select>
          </div>
          <Button onClick={downloadOutput}>Download output (CSV)</Button>
        </div>
      </div>
    </div>
  );
}

function ManageCarParksPage({ carParks, setCarParks }) {
  const [carParkNo, setCarParkNo] = useState("");
  const [address, setAddress] = useState("");
  const [editingNo, setEditingNo] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function resetForm() {
    setCarParkNo("");
    setAddress("");
    setEditingNo(null);
    setError("");
  }

  function save() {
    setError("");
    setSuccess("");
    const no = carParkNo.trim();
    const addr = address.trim();
    if (!no) { setError("Enter a Car Park No."); return; }
    if (!addr) { setError("Enter an address / parking place."); return; }

    if (editingNo === null) {
      if (carParks.some((c) => c.carParkNo.toLowerCase() === no.toLowerCase())) {
        setError("Car Park No '" + no + "' already exists. Car Park No must be unique.");
        return;
      }
      setCarParks((prev) => [...prev, { carParkNo: no, address: addr, tariffCar: "", tariffMc: "", tariffHv: "" }]);
      setSuccess("Car park '" + no + "' added.");
    } else {
      if (no.toLowerCase() !== editingNo.toLowerCase() && carParks.some((c) => c.carParkNo.toLowerCase() === no.toLowerCase())) {
        setError("Car Park No '" + no + "' already exists. Car Park No must be unique.");
        return;
      }
      setCarParks((prev) => prev.map((c) => (c.carParkNo === editingNo ? { ...c, carParkNo: no, address: addr } : c)));
      setSuccess("Car park '" + no + "' updated.");
    }
    resetForm();
  }

  function loadForEdit(c) {
    setEditingNo(c.carParkNo);
    setCarParkNo(c.carParkNo);
    setAddress(c.address);
    setError("");
    setSuccess("");
  }

  function removeCarPark(c) {
    const tagged = c.tariffCar || c.tariffMc || c.tariffHv;
    const msg = tagged
      ? "Delete car park '" + c.carParkNo + "'? It has tagged tariffs which will be removed."
      : "Delete car park '" + c.carParkNo + "'?";
    if (typeof window !== "undefined" && window.confirm && !window.confirm(msg)) return;
    setCarParks((prev) => prev.filter((x) => x.carParkNo !== c.carParkNo));
    if (editingNo === c.carParkNo) resetForm();
    setSuccess("Car park '" + c.carParkNo + "' deleted.");
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, color: COLORS.primary, margin: "0 0 4px" }}>{editingNo === null ? "Add car park" : "Edit car park — " + editingNo}</h2>
      <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 18px" }}>Car Park No is the primary key and must be unique. Tariff tagging is done on the Car parks &amp; outputs page.</p>

      <Banner kind="error" onClose={() => setError("")}>{error}</Banner>
      <Banner kind="success" onClose={() => setSuccess("")}>{success}</Banner>

      <div style={{ background: COLORS.panel, borderRadius: 10, padding: 18, marginBottom: 22 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>Car Park No (primary key)</label>
            <input style={inputStyle} value={carParkNo} onChange={(e) => setCarParkNo(e.target.value)} placeholder="e.g. AK83" />
          </div>
          <div style={{ flex: "2 1 360px" }}>
            <label style={labelStyle}>Address / parking place</label>
            <input style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="BLK 1234 SOME INDUSTRIAL PARK" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button onClick={save}>{editingNo === null ? "Add car park" : "Save changes"}</Button>
          {editingNo !== null ? <Button variant="ghost" onClick={resetForm}>Cancel edit</Button> : null}
        </div>
      </div>

      <h3 style={{ fontSize: 15, color: COLORS.text, margin: "0 0 10px" }}>Car parks ({carParks.length})</h3>
      {carParks.length === 0 ? (
        <p style={{ fontSize: 13, color: COLORS.muted }}>No car parks yet. Add one above.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640, fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F0F5FC" }}>
                {["Car Park No", "Address / Parking Place", "Tagged", ""].map((h, i) => (
                  <th key={i} style={{ padding: "8px 10px", border: "1px solid " + COLORS.border, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carParks.map((c) => {
                const tags = [c.tariffCar ? "C" : null, c.tariffMc ? "M" : null, c.tariffHv ? "H" : null].filter(Boolean);
                return (
                  <tr key={c.carParkNo}>
                    <td style={{ padding: "8px 10px", border: "1px solid " + COLORS.border, fontWeight: 600 }}>{c.carParkNo}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid " + COLORS.border }}>{c.address}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid " + COLORS.border, color: COLORS.muted }}>{tags.length ? tags.join(" · ") : "—"}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid " + COLORS.border, whiteSpace: "nowrap" }}>
                      <Button variant="ghost" onClick={() => loadForEdit(c)} style={{ padding: "5px 11px", marginRight: 8 }}>Edit</Button>
                      <Button variant="danger" onClick={() => removeCarPark(c)} style={{ padding: "5px 11px" }}>Delete</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AccountPage({ currentUser, users, setUsers, onExportDb, onImportDb, onResetToSeed }) {
  const isAdmin = currentUser.role === "admin";
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [resetUser, setResetUser] = useState("");
  const [resetPw, setResetPw] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [seedMsg, setSeedMsg] = useState("");

  function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!window.confirm("Loading a database file replaces all current tariffs, car parks and user accounts, and will sign you out. Continue?")) return;
    setImportMsg("Loading…");
    onImportDb(file).catch(() => setImportMsg("Could not read that file. Make sure it's a .sqlite database exported from this app."));
  }

  function handleResetToSeed() {
    if (!window.confirm("This replaces all current tariffs, car parks and user accounts in this browser with the latest baseline from GitHub, and signs you out. Continue?")) return;
    setSeedMsg("Loading…");
    onResetToSeed().catch(() => setSeedMsg("Could not fetch the latest baseline. Check your connection and try again."));
  }

  function changeOwn() {
    setMsg(""); setErr("");
    if (currentUser.password !== oldPw) { setErr("Current password is incorrect."); return; }
    if (!newPw.trim()) { setErr("Enter a new password."); return; }
    setUsers((prev) => prev.map((u) => (u.userId === currentUser.userId ? { ...u, password: newPw, mustChangePassword: false } : u)));
    currentUser.password = newPw;
    currentUser.mustChangePassword = false;
    setOldPw(""); setNewPw("");
    setMsg("Your password has been changed.");
  }

  function adminReset() {
    setResetMsg("");
    if (!resetUser || !resetPw.trim()) { setResetMsg("Select a user and enter a new password."); return; }
    setUsers((prev) => prev.map((u) => (u.userId === resetUser ? { ...u, password: resetPw, mustChangePassword: true } : u)));
    setResetPw("");
    setResetMsg("Password reset for " + resetUser + ". They will be asked to set a new password on next sign-in.");
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, color: COLORS.primary, margin: "0 0 18px" }}>Account</h2>
      <div style={{ background: COLORS.panel, borderRadius: 10, padding: 18, marginBottom: 22, maxWidth: 420 }}>
        <h3 style={{ fontSize: 15, margin: "0 0 12px" }}>Change my password</h3>
        <Banner kind="success" onClose={() => setMsg("")}>{msg}</Banner>
        <Banner kind="error" onClose={() => setErr("")}>{err}</Banner>
        <label style={labelStyle}>Current password</label>
        <input type="password" style={inputStyle} value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
        <div style={{ height: 12 }} />
        <label style={labelStyle}>New password</label>
        <input type="password" style={inputStyle} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
        <div style={{ height: 16 }} />
        <Button onClick={changeOwn}>Update password</Button>
      </div>

      <div style={{ background: COLORS.panel, borderRadius: 10, padding: 18, marginBottom: 22, maxWidth: 420 }}>
        <h3 style={{ fontSize: 15, margin: "0 0 12px" }}>Database</h3>
        <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 14px", lineHeight: 1.5 }}>
          All data is saved automatically to a SQLite database in this browser. Download a backup to move it to another machine or browser.
        </p>
        <Button variant="ghost" onClick={onExportDb}>Download database (.sqlite)</Button>
        {isAdmin ? (
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Load database (.sqlite) — admin only</label>
            <Banner kind="error" onClose={() => setImportMsg("")}>{importMsg}</Banner>
            <input type="file" accept=".sqlite,.db" onChange={handleImportFile} style={{ fontSize: 13 }} />
          </div>
        ) : null}
        {isAdmin ? (
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Reset to latest baseline — admin only</label>
            <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 8px", lineHeight: 1.4 }}>
              This browser keeps its own saved copy of the data and won't pick up updates pushed to GitHub on its own. Use this to discard local changes and re-fetch the latest committed dataset.
            </p>
            <Banner kind="error" onClose={() => setSeedMsg("")}>{seedMsg}</Banner>
            <Button variant="ghost" onClick={handleResetToSeed}>Reset to latest baseline</Button>
          </div>
        ) : null}
      </div>

      {isAdmin ? (
        <div style={{ background: COLORS.panel, borderRadius: 10, padding: 18, maxWidth: 420 }}>
          <h3 style={{ fontSize: 15, margin: "0 0 12px" }}>Admin — reset a user password</h3>
          <Banner kind="success" onClose={() => setResetMsg("")}>{resetMsg}</Banner>
          <label style={labelStyle}>User</label>
          <select style={inputStyle} value={resetUser} onChange={(e) => setResetUser(e.target.value)}>
            <option value="">— select user —</option>
            {users.map((u) => <option key={u.userId} value={u.userId}>{u.userId}</option>)}
          </select>
          <div style={{ height: 12 }} />
          <label style={labelStyle}>New password</label>
          <input type="password" style={inputStyle} value={resetPw} onChange={(e) => setResetPw(e.target.value)} />
          <div style={{ height: 16 }} />
          <Button variant="teal" onClick={adminReset}>Reset password</Button>
        </div>
      ) : null}
    </div>
  );
}

export default function App() {
  const dbRef = useRef(null);
  const [dbReady, setDbReady] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [tariffs, setTariffs] = useState([]);
  const [carParks, setCarParks] = useState([]);
  const [page, setPage] = useState("tariff");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await openOrInitDb(DEFAULT_USERS, SEED_TARIFFS, SEED_CAR_PARKS, SEED_DB_URL);
      if (cancelled) return;
      dbRef.current = db;
      const state = readState(db);
      setUsers(state.users);
      setTariffs(state.tariffs);
      setCarParks(state.carParks);
      setDbReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!dbReady) return;
    const db = dbRef.current;
    writeState(db, users, tariffs, carParks);
    persist(db);
  }, [dbReady, users, tariffs, carParks]);

  function handleExportDb() {
    const bytes = exportBytes(dbRef.current);
    const blob = new Blob([bytes], { type: "application/x-sqlite3" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jtc-car-park-tariff.sqlite";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleImportDb(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const db = await createDb(bytes);
    const state = readState(db);
    dbRef.current = db;
    setUsers(state.users);
    setTariffs(state.tariffs);
    setCarParks(state.carParks);
    setCurrentUser(null);
  }

  async function handleResetToSeed() {
    const db = await fetchSeedDb(SEED_DB_URL);
    const state = readState(db);
    dbRef.current = db;
    setUsers(state.users);
    setTariffs(state.tariffs);
    setCarParks(state.carParks);
    setCurrentUser(null);
  }

  if (!dbReady) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.muted, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
        Loading database…
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage users={users} onLogin={(u) => { setCurrentUser(u); setPage("tariff"); }} />;
  }

  if (currentUser.mustChangePassword) {
    return <ForceChangePasswordPage currentUser={currentUser} setUsers={setUsers} setCurrentUser={setCurrentUser} />;
  }

  const navItems = [
    { key: "tariff", label: "Tariff creation" },
    { key: "manage", label: "Manage car parks" },
    { key: "carpark", label: "Car parks & outputs" },
    { key: "account", label: "Account" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", color: COLORS.text }}>
      <header style={{ background: COLORS.primary, color: "#fff", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>JTC Car Park Tariff</span>
          <nav style={{ display: "flex", gap: 4 }}>
            {navItems.map((n) => (
              <span
                key={n.key}
                onClick={() => setPage(n.key)}
                style={{
                  padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 14,
                  background: page === n.key ? "rgba(255,255,255,0.18)" : "transparent",
                  fontWeight: page === n.key ? 700 : 500,
                }}
              >
                {n.label}
              </span>
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13 }}>
          <span style={{ opacity: 0.9 }}>{currentUser.userId} · {currentUser.role}</span>
          <span onClick={() => setCurrentUser(null)} style={{ cursor: "pointer", textDecoration: "underline" }}>Sign out</span>
        </div>
      </header>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 20px" }}>
        <div style={{ background: "#FFFBEA", border: "1px solid #E6CE7A", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: "#6B5414", marginBottom: 20 }}>
          MVP build. Data is saved automatically to a SQLite database in this browser and survives page reloads. Use Account → Database to download a portable .sqlite backup or load one on another machine. MVP assumptions: URA day-codes 1–5 use Mon-Fri values, 6 = Sat, 7 = Sun/PH; first two short-term rows map to bands 1 and 2 (extra short-term rows ignored); cap times derive from the capped row's own operating hours; the hourly-charges narrative shows the Mon-Fri value.
        </div>

        {page === "tariff" ? <TariffPage tariffs={tariffs} setTariffs={setTariffs} carParks={carParks} /> : null}
        {page === "manage" ? <ManageCarParksPage carParks={carParks} setCarParks={setCarParks} /> : null}
        {page === "carpark" ? <CarParkPage tariffs={tariffs} carParks={carParks} setCarParks={setCarParks} /> : null}
        {page === "account" ? <AccountPage currentUser={currentUser} users={users} setUsers={setUsers} onExportDb={handleExportDb} onImportDb={handleImportDb} onResetToSeed={handleResetToSeed} /> : null}
      </div>
    </div>
  );
}
