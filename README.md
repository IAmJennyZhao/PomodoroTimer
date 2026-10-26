# Little Room

**Pomodoros with Pet Gachas and Customizeable Rooms!** Turn focus time into surprise pets,
dress up your companions, and build your dream little room.

![A 25-minute timer and daily goal in a room with Miso, Mochi and a crowned Maple.](docs/media/room.jpg)

## Focus. Hatch. Decorate. Repeat.

- Pick a countdown or count-up timer, add a task, and get into the zone.
- Earn Shilligems, roll for eggs, and meet your next animal companion.
- Give your pets little accessories and your room a furniture makeover.
- Jot down a thought, chase your daily goal, and watch your Journal fill up.
- Put on some rain or fireplace sounds. Take a break. Come back for another round.

## Screenshots

| Focus and notes | Journal |
| --- | --- |
| ![An active count-up session with a saved Scratchpad beside the timer.](docs/media/focus-notes.jpg) | ![Daily goal, 74 fictional sessions and a 30-day activity chart.](docs/media/journal.jpg) |
| **Pets** | **Egg shop** |
| ![Miso, Mochi and Maple, with unlocked animations for Miso.](docs/media/pets.jpg) | ![Basic and mystery eggs, with the nest below.](docs/media/egg-shop.jpg) |

## Quick start

Install **Node.js 22 or 24 LTS**, then run:

```sh
git clone https://github.com/IAmJennyZhao/PomodoroTimer.git
cd PomodoroTimer
npm ci
npm start
```

Open the printed app URL, usually **http://127.0.0.1:3000**. Keep the terminal
running while using the app; **Ctrl+C** stops it.

For populated charts, pets and eggs, use `npm run demo` instead of `npm start`.
It normally runs at **http://127.0.0.1:3002**, with a fresh temporary profile
each launch. Your ordinary saves are separate.

## Built with

React 18, JavaScript and CSS power the interface. A central reducer handles
timer and collection rules; a Node.js HTTP service saves progress to local JSON
files with revision checks and a recovery backup. Charts use saved session
history, and Web Audio synthesizes the sounds.

Little Room runs on your computer without an account, database or cloud sync.
It needs the local Node service; a static-only host cannot provide saving.
Desktop use is the current target.

## Documentation

- [How to run](docs/SETUP.md) — setup, demo mode, production and local saves.
- [Technical guide](docs/ARCHITECTURE.md) — architecture, state, persistence and checks.

## License and artwork

Code and documentation use the [MIT license](LICENSE). The illustrated artwork
is generated and has [separate terms](ASSET_RIGHTS.md#limited-artwork-permission):
you may run Little Room and share screenshots; other artwork reuse is reserved.
See [third-party notices](THIRD_PARTY_NOTICES.md) for dependency attribution.
