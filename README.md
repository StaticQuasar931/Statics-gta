# Static's Escape Road

Static's Escape Road is a browser-based top-down sandbox prototype inspired by GTA-style gameplay loops. This demo focuses on showcasing modular systems, procedural world generation, and reusable architecture that can be expanded into a full-scale experience.

## Features

- **City & Wilderness**: Semi-handcrafted city districts combined with procedural outer terrain generated from a deterministic seed.
- **Vehicles & Physics**: Lightweight top-down vehicle physics with civilian and police AI drivers.
- **Driving & Pursuits**: Enter and exit cars, pilot tuned player handling, and escalate police chases that now include SWAT vans and helicopters.
- **Combat & Wanted System**: Weapon inventory, projectiles, ragdoll-lite reactions, and smarter heat decay that reacts to noise and damage.
- **Economy & Progression**: Missions, rewards, shops, and property hooks backed by a simple economy system.
- **NPC Ecosystem**: Pedestrians, gangs, and police units reacting dynamically to the player.
- **Asset-driven Rendering**: Canvas layers pull directly from the curated SVG library so every vehicle, character, and building block matches its concept art.
- **Iconic Landmarks**: Safehouses, garages, and every shop category now render with bespoke POI icons pulled from the dedicated SVG set.
- **UI & Flow**: Startup, character creation, HUD overlays, minimap, pause menu, interaction prompts, vehicle dashboard, and concept art gallery.
- **Polished Settings**: Graphics presets, day/night pacing, weather intensity, density sliders, hitbox debug overlay, and reduced motion toggle.
- **Concept Art Library**: Dedicated SVG placeholders for 10 building archetypes, vehicles, weapons, police gear, and characters.
- **Save/Load**: LocalStorage-based save slots preserve seed and player stats.

## Settings & Controls

- **Movement**: `WASD`/arrow keys, `Shift` to sprint (or boost when driving), `Space` or mouse to fire.
- **Vehicles**: Walk near a car and press `E` to hop in, `E` again to exit alongside the curb. High wanted levels trigger SWAT roadblocks that use the same art as their in-game counterparts.
- Open **Settings** from the title screen or pause menu to adjust visual quality, weather intensity, day/night cycle length, traffic and pedestrian density, or to show hitboxes.
- Toggle **Reduced Motion** to tone down weather streaks and keep the camera steady for sensitive players.
- A concept art gallery is available from both the title screen and pause menu; closing it returns you to the previous state.

## Getting Started

1. Serve the project using any static web server (for example `npx serve .`).
2. Open `http://localhost:3000` (or the reported port) in a modern browser.
3. Start a new game, customize your character, and explore the sandbox.

## Project Structure

```
index.html
assets/
  images/
    buildings/   # Ten unique building SVG modules
    poi/         # Safehouse, garage, and shop category markers
    vehicles/    # Civilian, emergency, and specialty vehicle art
    weapons/     # Firearm & explosive iconography
    characters/  # Protagonists and NPC archetypes
    police/      # Law enforcement equipment sheets
    ui/          # HUD layout references
  scripts/
    systems/     # Modular gameplay systems (world, vehicles, economy, etc.)
    main.js      # Entry point wiring the systems together
  styles/        # Global styling
```

## Extending

Each gameplay system is intentionally modular. You can build on the provided classes, swap implementations, or connect them to a full engine. The canvas renderer serves as a visual prototype that can be replaced with WebGL, Unity WebGL exports, or any other rendering backend.
