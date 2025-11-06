# Static's Escape Road

Static's Escape Road is a fully playable, browser-native, top-down sandbox that pays homage to open-world crime games. The demo focuses on crisp UI, responsive vehicle handling, deterministic world seeds, and a curated SVG art library so every building, character, and vehicle has a matching illustration.

## Highlights

- **Cinematic Lobby** – A polished title screen featuring *StaticQuasar931*, character creation with background stories, and instant access to settings or the concept-art gallery.
- **Procedural World** – A 3.6 km² city grid assembled from ten bespoke building archetypes, rotating POI icons, and seeded vehicle/NPC placement.
- **Responsive Gameplay** – WASD movement, smooth enter/exit vehicle flow on `E`, mouse-aim shooting, and car physics with drift, acceleration, and building-aware hitboxes.
- **Police Escalation** – Wanted heat rises from gunfire or collisions, dispatching police cruisers, SWAT vans, and foot patrols that chase, box in vehicles, and clamp exits.
- **Live HUD & Minimap** – Blurred glass UI panels, weapon icons, vehicle dashboards, interaction hints, and a minimap that mirrors the active camera and POIs.
- **Settings & Saving** – Density sliders, cycle timing, hitbox debug toggle, and a one-click LocalStorage save/load pipeline.
- **Concept Art Library** – Integrated gallery containing custom SVGs for buildings, vehicles, weapons, characters, shops, and police gear.

## Controls

| Action | Input |
| ------ | ----- |
| Move | `WASD` / Arrow keys |
| Enter/Exit Vehicle | `E` |
| Fire Weapon | Left mouse button / `Space` |
| Pause | `Esc` or `P` |
| Toggle Gallery | `M` (in-game) |

## Getting Started

1. Serve the project with any static web server (for example `npx serve .` or `python -m http.server`).
2. Open the served URL in a modern browser.
3. Click **Launch New Game**, configure your runner, and drop into the city.
4. Use **Esc/P** to pause, access settings, or return to the lobby.

## Project Structure

```
index.html
assets/
  images/         # Hand-authored SVG art for buildings, vehicles, weapons, NPCs, police, POIs, HUD
  scripts/
    main.js       # Lightweight bootstrap that imports the app module
    app.js        # Sets up assets, UI bindings, and the game loop
    core/
      assetLibrary.js  # Preloads and exposes the SVG catalog
      input.js         # Keyboard/mouse state manager
      uiManager.js     # Builds screens, HUD, settings, and gallery overlays
    game/
      world.js         # Procedural world, entities, physics, police AI, and rendering
  styles/
    style.css     # Global styling for screens, HUD, minimap, modals
```

## Save Data

Progress is stored locally under the key `static-escape-save-v2`. Loading pulls the saved seed, player stats, wanted level, and settings so worlds remain consistent across sessions.

## Extending the Demo

- Replace the canvas renderer with WebGL or a game engine export while keeping the modular logic.
- Swap SVG placeholders with production-ready art; the asset library already maps friendly keys to paths.
- Expand missions or economy hooks by layering additional systems atop `GameWorld`.

Enjoy the ride, and thanks for playing in StaticQuasar931's sandbox!
