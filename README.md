# Neon Grandline · StaticQuasar931 Edition

Neon Grandline is a browser-first, top-down crime sandbox inspired by blockbuster open-world series. Every system—world generation, rendering, AI, economy, UI—is hand-written in vanilla HTML/CSS/JS so the experience launches instantly on GitHub Pages with zero build tooling or external engines.

## Highlights

- **Custom neon renderer** – A performant Canvas2D pipeline paints the city with depth-sorted building caps, emissive roads, weather-aware skies, bespoke SVG building facades, and crisp sprites for every character, vehicle, and loot drop.
- **Playable sandbox loop** – Walk, sprint, aim, fire, loot, jack cars, bank scores, accept missions, and trigger escalating Metro responses. Crimes are bucketed logically so stray shots can’t catapult you to five stars.
- **Upgraded assets** – All buildings, vehicles, weapons, UI panels, and character portraits ship as bespoke SVG illustrations—no emoji placeholders, no broken links. Missing textures gracefully fall back to a neon procedural tile.
- **Police, AWL & economy tuning** – Active Wanted Level (AWL) points accrue per crime (e.g. +20 for vehicle theft, +100 for homicide), decay while you hide, and map cleanly onto the 50/120/300/600/1000 star thresholds. Metro patrols chase, ram, and fire from their cruisers while SWAT vans roll in at high stars. Garages sell upgradeable cars, banks support deposits or risky heists, and every casualty can drop cash.
- **Tuned pursuit pacing** – AWL decay now respects heat hold times, police sight-lines, and comfort settings, so you must break line-of-sight before the wanted level bleeds off. Crime logs stamp the current time and the toast stack has shifted to the top-right for quick situational reads.
- **Quality-of-life UX** – A StaticQuasar931-branded lobby, animated loader with live progress, responsive HUD, ESC-powered pause/settings overlay, restart/return buttons, toasts, and mission prompts keep the action readable across the requested desktop resolutions.
- **Third-person framing** – A chase-cam offset trails the protagonist so the playfield reads like a 3D diorama while preserving precise screen-to-world aiming. Dynamic drop-shadows under buildings, cars, and characters enhance the 3D read without heavy WebGL dependencies.
- **Refined driving physics** – Delta-aware friction, harder braking, clamped reverse speeds, and distinct stat packages for sedans, sports cars, bikes, trucks, and muscle cars make vehicles meaningfully faster than sprinting on foot while still controllable with keyboard steering. A HUD speedometer shows gear state and MPH in third-person view.

## Quick start

1. Serve the project (for example, `python -m http.server 8000`).
2. Open `http://localhost:8000` in Chrome, Firefox, Safari, or Edge.
3. Click **Launch City**. Assets preload, the loader tracks progress, and the simulation fades in automatically.
4. Use **Settings** (from the lobby or pause overlay) to toggle Performance, Balanced, or Cinematic density/fidelity profiles.

## Controls

| Action | Input |
| ------ | ----- |
| Move on foot | `W` `A` `S` `D` |
| Sprint | Hold `Shift` |
| Aim & fire | Mouse move + left click / tap |
| Interact (loot, shops, vehicles) | `E` |
| Brake / drift while driving | `Space` |
| Pause / resume & open overlay | `Esc` |
| Request a random mission | Lobby **Roll Mission** |

## Feature tour

### World, ambience, and rendering
- Canvas renderer with sky gradients (day/dusk/night), camera smoothing, and screen-to-world pointer mapping for precise aiming.
- Semi-procedural districts: arterial and diagonal roads, plazas, waterfront palettes, and shop beacons seeded per session.
- Tile-based ground shading plus highlight passes so building roofs pop while roads keep their lane markings.
- Mission seeds pick courier, getaway, or bank-heist beats and reward neon payouts when objectives complete.

### Gameplay systems
- **Player** – Stamina-based sprinting, contextual interaction hints, weapon cooldowns, health/armor tracking, incapacitation/respawn at the Skyline safehouse, and seamless car entry/exit.
- **Vehicles** – AI traffic lanes, steering physics, police pursuit behaviors, collision damage that can spawn loot and crimes, and player-owned deliveries from the garage catalogue.
- **NPCs** – Civilian wanderers react to nearby chaos, panic under high wanted levels, and drop cash when taken out. Gang variants sport custom palettes; cops use ballistic vests.
- **Crime telemetry** – Gunfire, vehicular collisions, theft, robberies, and homicides pour into capped buckets that produce AWL points while respecting per-crime ceilings, so stray shots stay minor yet repeated felonies summon elite responders.
- **Police** – Metro units spawn based on the 50/120/300/600/1000 AWL thresholds, chase using upgraded pursuit AI, shoot from their cruisers, and fall back once you bleed off the heat. SWAT vans join at four stars, and destroying a unit feeds the crime buckets.
- **Economy** – Garages sell high-end rides, weapons shops refill ammo or armor, boutiques provide cosmetic boosts, and banks handle safe deposits or high-risk robberies.
- **Loot** – Neon cash chips bob over the pavement and auto-collect when the player brushes past.

### Interface & UX
- Startup lobby with a refreshed city atlas, vehicle/weapons concept gallery, and StaticQuasar931 headline branding.
- Animated loader card with percentage updates pulled straight from the asset manifest.
- HUD with time-of-day, mission label, wanted stars plus live AWL readout, cash, vitals, vehicle status, hint rail, MPH/gear speedometer, and a crime tracker feed (severity-coded).
- ESC pause overlay featuring resume/settings shortcuts, restart/return buttons, and a keybind legend, while toasts announce purchases, loot, patrol alerts, and mission status.

## Project structure

```
index.html                     # Minimal entrypoint with inline favicon
assets/
  images/                      # Curated SVG art for people, vehicles, loot, UI, and maps
  scripts/
    main.js                    # Boots the application
    app.js                     # Orchestrates UI, world lifecycle, settings, and loop
    core/
      input.js                 # Keyboard, pointer, and touch handling
    engine/
      assets.js                # Asset manifest loader with neon fallbacks
      renderer.js              # Camera-aware Canvas2D renderer
    gameplay/
      world.js                 # City generation, update loop, crime handling, rendering glue
      player.js                # Player movement, stamina, weapons, interactions
      vehicle.js               # Vehicle physics and AI modes (traffic/police)
      npc.js                   # Pedestrian behaviour, panic, and damage resolution
      police.js                # Wanted level management and patrol spawning
      economy.js               # Garage, shop, and bank logic
      missions.js              # Mission templates, timers, rewards
      loot.js                  # Animated cash pickups
    ui/
      uiManager.js             # Lobby, loader, HUD, modal, toast, and pause overlay management
  styles/
    style.css                  # Lobby, HUD, loader, pause overlay, and responsive rules
```

## Compatibility

- Optimised for the requested desktop resolutions: 1300×730, 1366×768, 1517×852, 1536×864, and 1920×1080.
- Works in the latest Chrome, Edge, Firefox, and Safari releases with Canvas2D acceleration.
- Touch devices receive mapped pointer events (tap to fire, long-press to interact) via the shared input manager, making future mobile tuning straightforward.

## Developer hooks

A global `window.gameApp` reference exposes the live `App` instance. From the console you can script quick experiments:

```js
// Toggle cinematic density on the fly
gameApp.world.applySettings({ fidelity: 1.3, density: 1.3 });

// Deliver a dev-only prototype vehicle
gameApp.world.spawnOwnedVehicle({ label: 'Dev Prototype', maxSpeed: 360 }, gameApp.world.player);

// Pause or resume programmatically
gameApp.world.togglePause();
```

Drop the repo onto GitHub Pages and Neon Grandline boots immediately—no extra build step, no asset hunting. Every graphic, system, and quality-of-life feature is wired for StaticQuasar931’s audience out of the box.
