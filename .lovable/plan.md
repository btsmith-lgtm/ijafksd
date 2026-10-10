# Nova Games: add GTA 5 + cover pictures

## What changes
- Add **GTA 5** to Nova Games using https://web.archive.org/web/20261005232456/https://playgta5.com/ (opens through the proxy like the others).
- Give every game (24 total) its own cover picture. The list becomes a grid of picture cards with the game name under each picture.
- Clicking a card still opens the game inside Nova through the proxy, and "All games" still goes back.

## Pictures
- Generate an original cover-style picture for each game. The covers hint at each game's look and theme (zombies, skateboarding, sci-fi shooter, racing city, etc.) but won't use official logos or box art.
- Pictures are landscape and share one consistent style so the grid looks clean.

## Technical details
- Generate the images with the image tool (fast tier, 4 per batch) into `src/assets/nova-games/`, then import them in `ClassroomView.tsx`.
- Add an `image` field to each `NOVA_GAMES` entry, plus the GTA 5 entry.
- Cards: `aspect-video` image with `object-cover` and the name beneath; the grid stays responsive (2/3/4 columns).
