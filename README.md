# AlVel Garage

"AlVel" (アルヴェル) is the Japanese owners' nickname for the Alphard and Vellfire. An offline-capable web app (PWA) for owners of the 20-series Toyota Alphard / Vellfire (2008–2015). It's focused on the ANH20W/ANH25W 2.4, and also covers the GGH20/25 3.5 V6 and the ATH20 hybrid where the data exists.

It includes specs and fluids, a service schedule with due dates, part numbers, all five fuse boxes translated, DIY guides, known faults, an import buying checklist, a frame-number decoder, and a service log kept on the device (with export/import).

## Run it

```
python3 -m http.server 8765
```

Then open http://localhost:8765. There's no build step. To publish, push the folder to GitHub Pages, as with Bobby's Guitar.

## Data

Everything lives in `data/*.json`. The app only renders it.

| File | What |
|---|---|
| `vehicles.json` | Model codes, engines, frame prefixes (drives the model picker and decoder) |
| `specs.json` | Fluids, capacities, tyres, bulbs, brakes, ignition |
| `parts.json` | Part numbers |
| `schedule.json` | Service intervals (stored in km; shown in miles) |
| `fuses.json` | Fuse boxes: `[position, name, amps, circuit]` |
| `guides.json` | Step-by-step jobs |
| `faults.json` | Known faults |
| `buying.json` | Viewing checklist |
| `sources.json` | Every source the other files cite |

Any entry can be limited with `"engine": ["2AZ-FE", …]` and/or `"drive": "FF" | "4WD"`. Every entry should carry:

- `src`: source ids from `sources.json`
- `conf`: one of
  - `official`: from Toyota's own documents
  - `community`: owner or trade sources
  - `unverified`: general knowledge that still needs a source

The app shows these as green, amber and red badges.

Main sources: Toyota Japan's owner's manuals for the 20 series (2010/04 and 2012/09 editions, section 6-1 specs and 4-2 fuses) at https://manual.toyota.jp/alphard/, and the UK Alphard Club guides.

When you change any file, bump `APP_VERSION` in `app.js` and `VERSION` in `sw.js` together.

## Known gaps

- **Service intervals:** Toyota Japan's maintenance booklet isn't online, so the intervals are marked unverified.
- **Spark plugs, 12 V battery size, stud pattern:** not yet confirmed from a Toyota parts catalogue.
- **2008/05 – 2010/03 cars:** no online manual, so the paper glovebox manual is the check.
- **Not yet in the app:** warning-light meanings, the jacking-point diagram, timing-chain/drive-belt info, and photos.
