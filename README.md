# Static's Escape Road

Static's Escape Road is a browser-based top-down sandbox prototype inspired by GTA-style gameplay loops. This demo focuses on showcasing modular systems, procedural world generation, and reusable architecture that can be expanded into a full-scale experience.

## Features

- **City & Wilderness**: Semi-handcrafted city districts combined with procedural outer terrain generated from a deterministic seed.
- **Vehicles & Physics**: Lightweight top-down vehicle physics with civilian and police AI drivers.
- **Combat & Wanted System**: Weapon inventory, projectiles, ragdoll-lite reactions, and escalating police response.
- **Economy & Progression**: Missions, rewards, shops, and property hooks backed by a simple economy system.
- **NPC Ecosystem**: Pedestrians, gangs, and police units reacting dynamically to the player.
- **UI & Flow**: Startup, character creation, HUD overlays, minimap, pause menu, and concept art gallery.
- **Save/Load**: LocalStorage-based save slots preserve seed and player stats.

## Getting Started

1. Serve the project using any static web server (for example `npx serve .`).
2. Open `http://localhost:3000` (or the reported port) in a modern browser.
3. Start a new game, customize your character, and explore the sandbox.

## Project Structure

```
index.html
assets/
  images/        # AI-inspired placeholder concept art
  scripts/
    systems/     # Modular gameplay systems (world, vehicles, economy, etc.)
    main.js      # Entry point wiring the systems together
  styles/        # Global styling
```

## Extending

Each gameplay system is intentionally modular. You can build on the provided classes, swap implementations, or connect them to a full engine. The canvas renderer serves as a visual prototype that can be replaced with WebGL, Unity WebGL exports, or any other rendering backend.
