# Twig

Twig is a mobile app for parents and their children: daily check-ins, shared moments and weekly Discover questions, in a private space for each parent-child pair. This repository holds the app, its Supabase backend and the roadmap (GitHub project "Twig Product Board").

## What's here

| Path | What |
| --- | --- |
| `src/app/` | Screens, with [Expo Router](https://docs.expo.dev/router/introduction/): every file is a route, so tests for screens live in `src/__tests__/`. |
| `src/theme/` | Design tokens: colours for light and dark mode, the type scale (Figtree), spacing, radii, shadows and motion. Read them with `useTheme()`. In development builds, the home screen links to a screen that shows them all. |
| `src/components/` | Building blocks every screen uses: Button, TextField, CodeEntry, ChoiceRow, Chip, ScreenHeader, Card, ListRow, Sheet, Banner, toasts (`useToast()`), EmptyView, LoadingView, ErrorView, Avatar, Text and Icon. In development builds, the home screen links to a screen that shows each one in all its states. |
| `src/dev/` | Helpers for the development-only screens. |
| `src/lib/` | The Supabase client, the app's configuration and the generated database types. |
| `supabase/` | Database migrations, pgTAP tests and local Supabase config. See [docs/supabase.md](docs/supabase.md). |
| `docs/` | The Supabase runbook and the database design diagrams. |
| `scripts/db-test/` | Runs the database tests without Docker. |

The app is Expo SDK 58 (React Native, TypeScript). Native `ios/` and `android/` folders are generated from `app.json` and are not committed. [AGENTS.md](AGENTS.md) has Expo's guidance for coding agents.

## Running the app

Needs a current Node LTS (CI uses Node 24).

```bash
npm install
cp .env.example .env
npm start
```

`.env.example` points development builds at **Twig Dev**, the Supabase project with test data only. Never point a development build at **Twig**, which holds real families' data. Store builds get Twig's values from the build service, not from a file.

Open the app with Expo Go, or in the iOS Simulator (needs Xcode) or Android emulator from the menu that `npm start` shows. Libraries with their own native code will later need a development build (`npx expo run:ios`, or `eas build --profile development`).

Add packages with `npx expo install <package>`, which picks versions that match the Expo SDK.

## Checks

| Command | What |
| --- | --- |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint, with Expo's config. It also rejects raw colours and font values in `src/` outside `src/theme/`. |
| `npm test` | Unit tests (Jest, `jest-expo`) |
| `npm run doctor` | Expo's project checks |

Pull requests run all four in the **App type check, lint and tests** check, and the database migrations and tests in **Migrations and pgTAP tests**. Merging to `main` deploys migrations to Twig Dev, then Twig.
