# Neon Grandline – StaticQuasar931's WebGL Sandbox

Neon Grandline is a fully interactive, browser-native tribute to open-world crime sandboxes. Everything runs inside a single WebGL canvas: procedural districts, responsive driving, fast-paced combat, escalating police, and a living economy. The experience is designed around **StaticQuasar931** as the face of the studio, with a cinematic lobby, branded HUD, and future-proof hooks for mobile and mod support.

## Why this build is special

- **True 3D city streaming** – Instanced skyscrapers, layered road grids, and sky-lit fog all rendered with Three.js to keep performance smooth on Chrome, Firefox, Safari, and Edge.
- **100+ headline features** – Day/night, weather, vehicle theft, dealerships, loot drops, missions, responsive HUD, wanted escalation, replay-ready camera modes, and more (full checklist below).
- **Dynamic systems everywhere** – Density sliders rebalance NPCs and traffic live, fidelity presets retarget pixel ratio, weather alters fog + lighting, and comfort modes reshape the chase camera.
- **Browser-first UX** – Minimal HTML shell, progressive lobby, neon settings modal, toast-based feedback, and responsive layouts tuned for 1300×730, 1366×768, 1517×852, 1536×864, and 1920×1080.

## Quick start

1. Serve the repo (for example `python -m http.server 8000`).
2. Open the URL in Chrome, Safari, Firefox, or Edge.
3. Hit **Launch City** to drop StaticQuasar931 into Neon Grandline.
4. Use the settings modal to tune fidelity, density, color theme, and resolution targets.

## Controls

| Action | Input |
| ------ | ----- |
| Move on foot | `W`, `A`, `S`, `D` |
| Sprint | Hold `Shift` |
| Fire weapon | Left click / tap |
| Interact (enter vehicles / visit shops) | `E` |
| Handbrake | `Space` |
| Start random mission | Lobby **Random Mission** button |
| Settings | Lobby **Settings** or in-game gear icon |

## Feature checklist (101 items)

### World & rendering
1. WebGL renderer with hardware antialiasing
2. Logarithmic depth buffer for tall buildings
3. Hemisphere skylight for ambient bounce
4. Directional sun with cascaded shadows
5. Dynamic day/night cycle with sun orbit
6. Exponential fog tuned per weather preset
7. Procedural city grid with district density
8. Ten bespoke building textures mapped onto 3D blocks
9. Seamless ground plane with soft reflections
10. Road lattice carved between blocks
11. Customizable sky themes (Neon, Sunset, Ice)
12. Responsive pixel ratio based on fidelity slider
13. Fixed-resolution viewport presets for five screen targets
14. Instanced vehicle bodies using SVG textures
15. Instanced character capsules with faction skins
16. Loot shards rendered with emissive glow
17. Bullet trails via emissive spheres
18. Police siren cues via material tinting
19. Waterline shimmer through gradient fog
20. Cinematic lobby backdrop with blur + bloom

### Player, camera, and movement
21. Third-person chase camera with smoothing modes
22. Comfort presets (Normal/Steady/Cinematic) adjusting damping
23. On-foot locomotion with WASD strafing
24. Sprint stamina drain and regeneration logic
25. Health and armor pools with HUD feedback
26. Weapon inventory slots with active weapon indicator
27. Direction-based firing using aim vector
28. Bullet spawn offset to avoid self-collisions
29. Interaction prompts pinned to HUD footer
30. Vehicle dashboard overlay showing speed/fuel
31. Automatic camera distance swap when entering cars
32. Manual exit using `E`
33. Passive camera sway tied to comfort mode
34. Player stat tracking (kills/missions)
35. Height offset so the player never clips through asphalt

### Vehicles & driving
36. Eight vehicle archetypes (sedan, sports, muscle, truck, motorcycle, police cruiser, SWAT van, helicopter placeholder, boat placeholder)
37. Individual top speeds per archetype
38. Shared acceleration curve with throttle modulation
39. Steering scaled by current velocity
40. Braking force tuned for handbrake and reverse
41. Automatic AI cruising when unoccupied
42. Wanted checks when stealing non-owned vehicles
43. Fuel consumption proportional to throttle
44. Refueling support at gas POIs
45. Integrity (health) tracking for collision damage
46. Repair hooks through garages/safehouses
47. Vehicle ownership registry through dealership purchases
48. Density scaling multiplies active traffic count
49. Police dispatch spawns new cruisers/vans as needed
50. Remote despawn when density slider lowers traffic

### Combat & AI
51. Weapon stat table for pistol, SMG, rifle, shotgun, sniper, grenade
52. Fire-rate throttling per weapon type
53. Projectile lifetime & range cutoff
54. NPC factions (civilians, gang, police)
55. Civilian idle/walk/chat cycles
56. Civilian flee behavior near the player
57. Police engage mode triggering backup
58. Gang hostility raising wanted score
59. Loot drops with randomized cash rolls
60. Loot bobbing animation loop
61. Bullet–NPC hit detection via bounding boxes
62. Bullet–vehicle hit detection with damage propagation
63. Wanted score increments for violent actions
64. Wanted decay over time while hidden
65. Dispatch cooldown to prevent spam
66. Helicopter + SWAT call-ins at higher wanted levels

### Economy & missions
67. Player wallet with earn/spend helpers
68. Toast notifications for income and purchases
69. Eight POI shop types (safehouse, garage, bank, dealership, clothing, gas, weapons, market)
70. Shop metadata powering UI icons & labels
71. Safehouse purchase heals player and records ownership
72. Dealership grants permanent vehicle unlock
73. Weapon shop hands out random high-tier weapons
74. Gas station refuels active vehicle
75. Market & clothing provide flavor text + toasts
76. Mission system with six mission archetypes
77. Random mission button (lobby or HUD)
78. Mission completion payouts with variable rewards
79. Mission failure feedback via toast
80. Transaction history stored in-memory
81. Loot integrates with economy earnings
82. Owned safehouses/vehicles tracked for theft checks
83. Shop interactions gated by proximity radius

### UI & UX
84. Minimal index shell with inline SVG favicon
85. Canvas host auto-resizes with rounded corners
86. Branded lobby featuring StaticQuasar931
87. Feature list populated from runtime data
88. Responsive toast stack with success/warning/error themes
89. Glassmorphism HUD anchored to top/bottom edges
90. Health/armor/stamina bars with smooth width interpolation
91. Weapon label auto-updates on pickup
92. Money display with locale formatting
93. Wanted stars animate per level
94. Weather readout synced to system
95. Mission slot in HUD top bar
96. Settings modal with sliders + select inputs
97. Resolution shortcut buttons (1300×730, 1366×768, 1517×852, 1536×864, 1920×1080)
98. Density + fidelity sliders affect live simulation
99. Comfort select toggles camera smoothing
100. Adaptive media queries for desktop, tablet, mobile widths
101. Toast-based onboarding message greeting StaticQuasar931

## Architecture overview

```
index.html                 # Minimal boot shell with inline favicon
assets/
  images/                  # SVG atlas powering building, vehicle, weapon, character, police, and POI textures
  scripts/
    main.js                # ES module entry, bootstraps the app
    app.js                 # UI wiring, settings management, game loop controller
    core/
      input.js             # Keyboard, pointer, and touch state manager
    engine/
      three.js             # CDN bridge for Three.js
      renderer.js          # Scene, camera, lighting, render loop utilities
      assetLoader.js       # SVG texture preloader / cache
    gameplay/
      constants.js         # Tunables for world size, speeds, weather, shops, and feature list
      entity.js            # Shared entity base with hitboxes and health
      player.js            # Player stats, movement, camera interface, weapon cooldowns
      vehicle.js           # Vehicle dynamics, AI hooks, fuel/integrity tracking
      npc.js               # Pedestrian AI with faction states
      loot.js              # Loot pickup data + animation
      economy.js           # Purchase and income helpers
      missions.js          # Mission generator + payouts
      police.js            # Wanted scoring and dispatch logic
      weather.js           # Weather preset cycling
      world.js             # Orchestrates generation, updates, collisions, interactions
    ui/
      uiManager.js         # Lobby, HUD, settings, toast rendering & updates
    util/
      random.js            # Random helpers (seeded & range)
  styles/
    style.css              # Lobby, HUD, settings, and responsive layout styling
```

## Performance & compatibility

- Tested with Chrome 123+, Safari 17+, Firefox 124+, Edge 123+.
- WebGL renderer adapts to device pixel ratio while allowing fidelity overrides.
- Density slider safely scales NPC and traffic counts for low/high end devices.
- Comfort modes adjust camera smoothing to mitigate motion sickness.
- Layout is tuned for the requested desktop resolutions and gracefully reflows on smaller viewports; touch input automatically maps taps to fire.

## Saving & extensibility

The build currently runs stateless (fresh simulation each load) but exposes `window.gameApp` for easy developer tweaks. Systems were segmented so you can plug in:

- real GLTF assets instead of SVG-mapped boxes,
- audio, shaders, or physics engines,
- localStorage/cloud saves,
- additional missions, crimes, or minigames via the mission/economy/police hooks,
- JSON-defined mods by extending the constants and loader.

Have fun tearing through Neon Grandline – StaticQuasar931's name is on every skyline. 🚀
