# JTC Car Park Tariff — MVP Requirements

A single-page React app for managing car park parking tariffs and exporting them
to four CSV formats. This document is the full specification; the accompanying
`jtc-car-park-tariff-mvp.jsx` file is a working implementation of it.

---

## 1. Environment & handoff notes

- Built originally as a Claude artifact (React, single file, in-memory state).
- The artifact sandbox does **not** support `localStorage`, so the artifact holds
  all data in React state and resets on full page reload.
- **Intended target:** a real Vite + React project on a personal machine, with
  the in-memory state swapped for `localStorage` (or a small backend) for
  persistence. Everything else carries over unchanged.
- **Newline safety rule (important):** all CSV row separators and in-cell
  narrative line breaks MUST be built with `const NL = String.fromCharCode(10)`.
  Do NOT use literal newline characters inside string literals — a prior Copilot
  build repeatedly produced "unterminated string constant" errors from that.

---

## 2. Pages

Three functional areas plus an account page:

1. **Login**
2. **Tariff creation / Tariff master**
3. **Manage car parks** (add / edit / delete)
4. **Car park information + tariff tagging + outputs**
5. **Account** (change / reset password)

---

## 3. Login

- Default user account: `fems` / `P@ssw0rd1`
- Admin fallback account: `admin` / `admin`
- Normal user login and admin login.
- A logged-in user can change their own password.
- An admin can reset any user's password.
- Simple frontend/local auth is acceptable for MVP. No production-grade auth
  required.

---

## 4. Tariff creation / Tariff master

### Tariff ID rules
- Free-typed by the user; it is the primary key.
- Must be unique.
- Never auto-generated; never hardcode legacy IDs (e.g. `V11`, `V31`, `E72`)
  unless the user creates them manually.

### Entry model
- Fixed-template manual entry (no import/upload for MVP).
- Vehicle Type is a dropdown.
- Mode of Charges is a dropdown.
- Rate/value fields are free-text.

### Vehicle Type dropdown values
- `C - Car`
- `M - Motorcycle`
- `H - Heavy Vehicle`

### Mode of Charges dropdown values
- `Short-term rate`
- `Day Capped rate (if any)`
- `Night Capped rate (if any)`

### Tariff structure
Each tariff = a header (Tariff ID + Vehicle Type) plus one or more schedule
rows. Each schedule row has:

- Operating hours (free-text, e.g. `0700 to 2230`)
- Mode of charges (dropdown)
- Mon - Fri (free-text)
- Sat (free-text)
- Sun / PH (free-text)

Example rows for one tariff:

```
0700 to 2230 | Short-term rate            | 60c / 30min | 60c / 30min | Free Parking
0700 to 2230 | Day Capped rate (if any)   | 12          | 12          | Free Parking
2230 to 0700 | Short-term rate            | 60c / 30min | 60c / 30min | 6
```

### Validation (on save)
1. **Tariff ID uniqueness** — reject the save if the Tariff ID already exists.
2. **Full metadata duplicate** — reject the save if another tariff has an
   identical vehicle type AND an identical full set of rows (all operating
   hours, all modes, all Mon-Fri, all Sat, all Sun/PH values). Prompt the user
   to reuse the existing tariff.
   - Compare the complete ordered row set. Trim/normalise whitespace on compare.

### Editing
- Tariffs can be edited after assignment to car parks.
- If editing a tariff that is already assigned, show a warning:
  `This tariff is assigned to X car parks. Saving will affect all linked car parks.`
- For MVP, showing the warning is enough; the save still proceeds.

---

## 5. Manage car parks

- Car Park No is the primary key (Car Park ID = Car Park No); must be unique.
- Add a car park: Car Park No + Address / Parking Place.
- Edit a car park's number and address.
- Delete a car park (confirm; warn if it has tagged tariffs).
- Tariff tagging itself is done on the Car park information page, not here.

### Sample car parks (seed data)
```
A1002 | BLK 4001-4003/4026-4028/4033-4035 ANG MO KIO INDUSTRIAL PARK 1
A1003 | BLK 5022 TO 5095 ANG MO KIO INDUSTRIAL PARK 2
A1000 | BLK 1001/1010 BUKIT MERAH LANE 1/3
D1000 | BLK 4001-4008 DEPOT LANE
E1000 | BLK 1001-1085 EUNOS INDUSTRIAL ESTATE
```

---

## 6. Car park information + tariff tagging

### Fields shown (MVP)
- Car Park No
- Address / Parking Place
- Tagged tariff for Car
- Tagged tariff for Motorcycle
- Tagged tariff for Heavy Vehicle

Other car park fields are left blank for MVP.

### Searchable car park selector
- Car Park No is a searchable combo box.
- Search matches Car Park No (e.g. `A1002`) OR address (e.g. `ANG MO KIO`).
- On selection: address auto-populates and existing tagged tariffs load.

### Tagging logic
- One tariff each for Car, Motorcycle, Heavy Vehicle per car park.
- Each dropdown is filtered by vehicle type:
  - Car dropdown shows only `C - Car` tariffs.
  - Motorcycle dropdown shows only `M - Motorcycle` tariffs.
  - Heavy Vehicle dropdown shows only `H - Heavy Vehicle` tariffs.
- Single-select dropdowns enforce "one tariff per vehicle type per car park"
  structurally; re-saving replaces the prior selection.
- User can save tagging.

---

## 7. Outputs

One **Output Type** dropdown + one **Download Output** button (not four separate
buttons). All outputs download as CSV for MVP.

Dropdown options, in order:
1. URA Excel Output
2. Car Park Info Output
3. Tariff with car park data
4. Car Park New Hourly Charges Output

### Day Code mapping (used by URA output)
```
1 - Monday
2 - Tuesday
3 - Wednesday
4 - Thursday
5 - Friday
6 - Saturday
7 - Sunday / Public Holiday
```

### Time rule (URA output)
- Target format HH24MI (e.g. `0700`, `2230`).
- If an end time crosses midnight, add 2400 (e.g. end `0600` next day -> `3000`).
- Parse the free-text `HHMM to HHMM` operating-hours string on ` to `.
- Be tolerant: values that cannot be parsed cleanly pass through unchanged.

---

### Output 1 — URA Excel Output

Columns (exact order, 22 total):

```
Record Type*, Tariff ID*, Vehicle Type, Day Code*,
1 Op Hours From, 1 Op Hours To, 1 Amount, 1 Block,
2 Op Hours From, 2 Op Hours To, 2 Amount, 2 Block,
Day Capped At*, Day Capped Start Time*, Day Capped End Time*,
Overnight Capped at*, Overnight Capped Start Time*, Overnight Capped End Time*,
Parking Tariff Scheme*, Effective Start Date*, Effective End Date*, Authority Code*
```

Fixed values / rules:
- Record Type default = `D`
- Effective Start Date and Effective End Date = blank (users fill manually later)
- Authority Code = `1 - URA`
- Parking Tariff Scheme = `2 - Permanent Parking`

Row generation: for each car park, for each tagged tariff, emit one row per
Day Code 1-7.

### Output 2 — Car Park Info Output

Columns (exact order, 13 total):

```
Record Type*, Effective Start Date*, Effective End Date*, Car Park Type*,
Car Park Name*, Car Park ID*, Car Park Group ID, Tariff ID*,
Parking Grace Period*, Authority Code*, HDB Branch Code,
Car Park Agent ID*, Filler*
```

Rules:
- Record Type = `D`
- Effective Start Date = blank
- Effective End Date = blank
- Car Park ID = Car Park No
- Car Park Name = Address / Parking Place
- Authority Code = `1-URA`
- Parking Grace Period = `Will align with URA`
- HDB Branch Code, Car Park Agent ID, Filler = blank
- Car Park Type, Car Park Group ID = blank for MVP
- Generate one row per car park/tariff association (a car park with Car + MC + HV
  tagged emits 3 rows; only tagged vehicle types produce rows).

### Output 3 — Tariff with Car Park Data

A joined output of car park and tariff schedule.

Columns (exact order, 8 total):

```
Parking Place, Tariff ID, Vehicle Type, Operating hours, Mode of charges,
Mon - Fri, Sat, Sun / PH
```

Rules:
- For each car park, for each tagged tariff (Car, Motorcycle, Heavy Vehicle),
  output that tariff's schedule rows (one CSV row per schedule row).
- Parking Place = address followed by car park no in parentheses, e.g.
  `BLK 4001-4003/4026-4028/4033-4035 ANG MO KIO INDUSTRIAL PARK 1 (A1002)`
- Values pass through verbatim (no HH24MI conversion, no day-code expansion).

### Output 4 — Car Park New Hourly Charges Output

A human-readable narrative summary.

Columns (3 total):

```
car_park_no, address, New Hourly Charges
```

Rules:
- One row per car park.
- `New Hourly Charges` is a multi-line narrative grouped by vehicle type, in the
  order Car, Motorcycle, Heavy Vehicle. Each vehicle-type heading is followed by
  its tariff lines.
- If no tariff is tagged for a vehicle type, output `Not Applicable` under that
  heading.
- Line format per schedule row: `{operating hours} - {value}`.
- All internal line breaks use `NL` (String.fromCharCode(10)); the whole cell is
  CSV-quoted so it survives as one field.

Example `New Hourly Charges` cell:
```
Car
0700 to 2230 - 60c / 30min
0700 to 2230 - 12
2230 to 0700 - 60c / 30min
2230 to 0700 -
Motorcycle
Not Applicable
Heavy Vehicle
Not Applicable
```

---

## 8. Visual design

React SPA, professional blue/teal corporate palette:

- Primary blue: `#0057B8`
- Dark blue hover: `#00408A`
- Teal accent: `#00A3A3`
- Soft background: `#F4F7FB`
- Soft blue panel: `#EDF5FF`

---

## 9. MVP assumptions (decided during build; revisit for production)

These were chosen to keep the MVP moving and are surfaced in-app in a banner.
They are the most likely things to need correction once real data is exported.

1. **URA amount per day code** — Day Codes 1-5 (Mon-Fri) use the Mon-Fri value,
   Day Code 6 uses the Sat value, Day Code 7 uses the Sun/PH value.
2. **URA band assignment** — the first `Short-term rate` schedule row maps to the
   `1 ...` column group, the second maps to the `2 ...` group. A third or later
   short-term band is ignored for MVP.
3. **URA cap times** — Day Capped Start/End and Overnight Capped Start/End are
   derived from the respective capped row's own operating hours (the template
   does not capture separate explicit cap times). If caps should use fixed
   windows instead, define them.
4. **URA `1 Block` / `2 Block`** — left blank (no block source in the MVP data
   model).
5. **Output 4 narrative value** — each line shows the Mon-Fri value (per the
   provided example). Could be extended to show all three (Mon-Fri / Sat / Sun-PH).

---

## 10. Core user flows

1. **Login** — user or admin signs in; user changes own password; admin resets a
   password.
2. **Create tariff** — enter Tariff ID -> select vehicle type -> fill rows ->
   save -> ID-duplicate check -> full-metadata-duplicate check.
3. **Manage car parks** — add / edit / delete car parks (unique Car Park No).
4. **Tag tariff to car park** — search/select Car Park No -> pick Car / MC / HV
   tariffs -> save tagging.
5. **Generate output** — select output type -> Download Output -> CSV generated.
