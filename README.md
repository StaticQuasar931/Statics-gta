# Neon Grandline · StaticQuasar931 Edition

Neon Grandline is a browser-first, custom-rendered tribute to blockbuster open-world sandboxes. It runs entirely in vanilla HTML, CSS, and JavaScript—no build step, no external engines. A bespoke software renderer draws the city, vehicles, and characters on a single `<canvas>` element so everything works the moment you drop the repo on GitHub Pages.

## Highlights

- **Hand-written 3D renderer** – A Canvas2D-based pipeline projects meshes, shades faces, and draws neon-lit skyscrapers, vehicles, and pedestrians with day/night aware lighting.
- **Neon district layout** – Waterfront boardwalk, arterial roads, plazas, trees, and shop beacons carve the city into themed districts with varied palettes.
- **Working city sandbox** – Walk, sprint, hijack cars, fire weapons, collect loot, trigger missions, visit shops, and watch wanted levels climb as Metro Patrol deploys cruisers.
- **Crime telemetry** – Every gunshot, collision, or theft is logged with severity and wanted gain so you always know why the stars are flashing.
- **Responsive UX** – A cinematic lobby starring StaticQuasar931, animated loader, branded HUD, toast notifications, and modal-driven settings all tuned for multiple desktop resolutions.
- **Zero external dependencies** – Every asset (buildings, vehicles, characters, UI) is bundled as SVG; the game boots instantly without CDN calls or WebGL extensions.

## Quick start

1. Serve the folder (e.g. `python -m http.server 8000`).
2. Open `http://localhost:8000` in Chrome, Firefox, Safari, or Edge.
3. Click **Launch City**—the loader will fade out and drop you into Neon Grandline.
4. Use the lobby **Settings** button at any time to apply performance, balanced, or cinematic simulation profiles.

## Controls

| Action | Input |
| ------ | ----- |
| Move on foot | `W` `A` `S` `D` |
| Sprint | Hold `Shift` |
| Fire weapon | Left click / tap |
| Interact (loot, shops, vehicles) | `E` |
| Brake / drift in vehicles | `Space` |
| Toggle mission | Lobby **Roll Mission** |

## Feature tour

### World, rendering, and ambience
- Canvas renderer with per-face lighting, back-face culling, and painter’s sort.
- Procedural downtown: tapered towers, rooftop signage, emissive windows, and planted plazas in four themed districts.
- Waterfront boardwalk, ring roads, diagonal expressways, and glowing shop pylons to keep navigation readable at street level.
- Dynamic day/night loop that adjusts sky gradients, ambient light, and debug overlay (now showing the active district).
- Chase camera that tracks the player or mounted vehicle with distance smoothing.

### Gameplay systems
- **Player**: walking, sprint stamina, health/armor pools, firearm cooldown, interaction hints, enter/exit vehicles.
- **Vehicles**: throttle/brake, velocity-based steering, multi-part meshes with headlights/wheels, collision handling that injures pedestrians, and owned rides from the dealership.
- **Police**: escalating wanted score with decay timer and patrol spawns that chase and damage the player if caught on foot.
- **NPCs**: civilian/gang/police walkers with outfits, head meshes, and impact reactions that can drop cash or call in Metro Patrol.
- **Economy**: dealership, garage, weapons vendor, and bank POIs offering purchases, repairs, and deposits via in-world modals.
- **Loot**: animated cash shards bobbing above the pavement, immediately convertible to wallet funds.
- **Missions**: rotating courier/heist/race gigs that auto-complete after a run timer, rewarding cash and resetting the HUD callout.
- **Crime tracker**: unified logging that differentiates gunfire, vehicular assaults, theft, and patrol sightings while adjusting wanted stars.

### Interface
- StaticQuasar931-branded lobby with concept art carousel and requested resolution list (1300×730 up to 1920×1080).
- Animated loader card with progress shimmer while the sandbox spins up.
- HUD showing time, mission name, wanted stars, cash, vitals, vehicle readout, contextual hints, and a live crime tracker feed.
- Toast notifications for purchases, mission events, patrol alerts, and greetings.
- Modal settings chooser offering three tuned simulation profiles.

## Project structure

```
index.html                     # Minimal entrypoint with inline favicon
assets/
  images/                      # SVG placeholders for buildings, vehicles, weapons, characters, UI
  scripts/
    main.js                    # Boots the app once the DOM is ready
    app.js                     # Manages UI wiring, settings modal, and render loop
    core/
      input.js                 # Keyboard / pointer / touch tracking
    engine/
      math.js                  # Small vector helpers and color utilities
      meshes.js                # Primitive generators (boxes, prisms, extrusions)
      renderer.js              # Software renderer that projects and shades meshes
    gameplay/
      world.js                 # City generation, update loop, collisions, bullets
      player.js                # Player state, movement, interaction, weapons
      vehicle.js               # Vehicle dynamics + AI steering
      npc.js                   # Civilian/gang walker behaviour
      police.js                # Wanted level and patrol spawns
      economy.js               # Shop catalogue and purchase flows
      missions.js              # Mission selection + completion rewards
      loot.js                  # Animated cash pickups
    ui/
      uiManager.js             # Lobby, loader, HUD, modal, toast logic
  styles/
    style.css                  # Lobby, loader, HUD, modal, and responsive rules
```

## Compatibility

- Designed for modern desktop browsers (Chrome, Edge, Safari, Firefox) with Canvas2D acceleration enabled.
- Works at the requested 1300×730, 1366×768, 1517×852, 1536×864, and 1920×1080 resolutions; the layout gracefully compresses below 900px wide.
- Touch input (taps = fire, long press = interact) is automatically recognised via the input manager.

## Developer hooks

The global `window.gameApp` reference exposes the running `App` instance. From the console you can trigger quick tweaks:

```js
// Force a cinematic profile
window.gameApp._openSettingsModal();
window.gameApp.world.applySettings({ fidelity: 1.3, density: 1.3 });

// Spawn a custom vehicle
window.gameApp.world.spawnOwnedVehicle({ label: 'Dev Prototype', maxSpeed: 160 }, window.gameApp.world.player);
```

Drop the repo into your GitHub Pages site and Neon Grandline is ready for StaticQuasar931’s audience—no extra build tooling required.
