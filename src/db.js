import initSqlJs from "sql.js";

const IDB_NAME = "jtc-tariff-db";
const IDB_STORE = "files";
const IDB_KEY = "main";

const SCHEMA = `
  CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE tariffs (
    tariff_id TEXT PRIMARY KEY,
    vehicle_type TEXT NOT NULL
  );
  CREATE TABLE tariff_rows (
    tariff_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    op_hours TEXT,
    mode TEXT,
    mon_fri TEXT,
    sat TEXT,
    sun_ph TEXT,
    PRIMARY KEY (tariff_id, seq)
  );
  CREATE TABLE car_parks (
    car_park_no TEXT PRIMARY KEY,
    address TEXT,
    tariff_car TEXT,
    tariff_mc TEXT,
    tariff_hv TEXT
  );
`;

let sqlModulePromise = null;
function getSQL() {
  if (!sqlModulePromise) {
    sqlModulePromise = initSqlJs({ locateFile: (file) => import.meta.env.BASE_URL + file });
  }
  return sqlModulePromise;
}

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadPersistedBytes() {
  const idb = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function savePersistedBytes(bytes) {
  const idb = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function createDb(bytes) {
  const SQL = await getSQL();
  return bytes ? new SQL.Database(bytes) : new SQL.Database();
}

export async function fetchSeedDb(seedDbUrl) {
  const resp = await fetch(seedDbUrl, { cache: "no-store" });
  if (!resp.ok) throw new Error("Seed database fetch failed: " + resp.status);
  const bytes = new Uint8Array(await resp.arrayBuffer());
  const db = await createDb(bytes);
  await savePersistedBytes(db.export());
  return db;
}

export async function openOrInitDb(defaultUsers, seedTariffs, seedCarParks, seedDbUrl) {
  const bytes = await loadPersistedBytes();
  if (bytes) {
    return createDb(bytes);
  }

  if (seedDbUrl) {
    try {
      return await fetchSeedDb(seedDbUrl);
    } catch (e) {
      // network/file unavailable — fall through to the built-in seed below
    }
  }

  const db = await createDb();
  db.run(SCHEMA);
  writeState(db, defaultUsers, seedTariffs, seedCarParks);
  await savePersistedBytes(db.export());
  return db;
}

export function writeState(db, users, tariffs, carParks) {
  db.run("DELETE FROM tariff_rows; DELETE FROM tariffs; DELETE FROM car_parks; DELETE FROM users;");

  const uStmt = db.prepare("INSERT INTO users (user_id, password, role, must_change_password) VALUES (?, ?, ?, ?)");
  for (const u of users) uStmt.run([u.userId, u.password, u.role, u.mustChangePassword ? 1 : 0]);
  uStmt.free();

  const tStmt = db.prepare("INSERT INTO tariffs (tariff_id, vehicle_type) VALUES (?, ?)");
  const rStmt = db.prepare("INSERT INTO tariff_rows (tariff_id, seq, op_hours, mode, mon_fri, sat, sun_ph) VALUES (?, ?, ?, ?, ?, ?, ?)");
  for (const t of tariffs) {
    tStmt.run([t.tariffId, t.vehicleType]);
    t.rows.forEach((row, i) => {
      rStmt.run([t.tariffId, i, row.opHours || "", row.mode || "", row.monFri || "", row.sat || "", row.sunPh || ""]);
    });
  }
  tStmt.free();
  rStmt.free();

  const cStmt = db.prepare("INSERT INTO car_parks (car_park_no, address, tariff_car, tariff_mc, tariff_hv) VALUES (?, ?, ?, ?, ?)");
  for (const c of carParks) cStmt.run([c.carParkNo, c.address, c.tariffCar || "", c.tariffMc || "", c.tariffHv || ""]);
  cStmt.free();
}

export function readState(db) {
  const users = [];
  let stmt = db.prepare("SELECT user_id, password, role, must_change_password FROM users");
  while (stmt.step()) {
    const r = stmt.getAsObject();
    users.push({ userId: r.user_id, password: r.password, role: r.role, mustChangePassword: !!r.must_change_password });
  }
  stmt.free();

  const tariffMeta = [];
  stmt = db.prepare("SELECT tariff_id, vehicle_type FROM tariffs");
  while (stmt.step()) {
    const r = stmt.getAsObject();
    tariffMeta.push({ tariffId: r.tariff_id, vehicleType: r.vehicle_type });
  }
  stmt.free();

  const tariffs = [];
  const rowStmt = db.prepare("SELECT op_hours, mode, mon_fri, sat, sun_ph FROM tariff_rows WHERE tariff_id = ? ORDER BY seq");
  for (const t of tariffMeta) {
    rowStmt.bind([t.tariffId]);
    const rows = [];
    while (rowStmt.step()) {
      const r = rowStmt.getAsObject();
      rows.push({ opHours: r.op_hours, mode: r.mode, monFri: r.mon_fri, sat: r.sat, sunPh: r.sun_ph });
    }
    rowStmt.reset();
    tariffs.push({ ...t, rows });
  }
  rowStmt.free();

  const carParks = [];
  stmt = db.prepare("SELECT car_park_no, address, tariff_car, tariff_mc, tariff_hv FROM car_parks");
  while (stmt.step()) {
    const r = stmt.getAsObject();
    carParks.push({ carParkNo: r.car_park_no, address: r.address, tariffCar: r.tariff_car || "", tariffMc: r.tariff_mc || "", tariffHv: r.tariff_hv || "" });
  }
  stmt.free();

  return { users, tariffs, carParks };
}

export async function persist(db) {
  await savePersistedBytes(db.export());
}

export function exportBytes(db) {
  return db.export();
}
