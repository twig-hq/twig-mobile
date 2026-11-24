# Design sources

The product and design spec lives in the Twig Google Doc (Architecture and Database tabs). This folder holds the files behind it.

## diagrams/

The 21 Mermaid figures in the doc: `a01` to `a11` are the Architecture tab's figures 1 to 11, and `d01` to `d10` are the Database tab's figures 1 to 10.

They were recovered on November 15, 2026 from the doc's own image links (each mermaid.ink link carries its source), after the originals were lost with the old laptop. `python3 -I diagrams/render.py --check` confirms every file still reproduces its link in the doc exactly.

| File | What it is |
| --- | --- |
| `*.mmd` | Figure sources. Edit these. |
| `theme.json` | The Mermaid config every figure uses (the doc's green and cream palette). Keep it so new figures match. |
| `urls.json` | Each figure's mermaid.ink link, PNG width and display size in the doc. |
| `render.py` | Renders figures to PNG and updates `urls.json`. See its header for usage. |

To change a figure, edit its `.mmd`, run `python3 -I diagrams/render.py <out_dir> <name>`, then replace the image in the doc using the URL from `urls.json`, copied exactly.

Known stale figure: `a01` still says "26 tables"; the schema has 30 public tables plus two private ones (OAuth tokens, and wrong invite guesses for the code rate limit).

## App icon and splash screen

The logo is two thumbprint birds leaning on each other: the larger green one is the parent, the smaller orange one is the child. The files the app ships are in `assets/images/` and are set in `app.json`.

| File | Used for |
| --- | --- |
| `icon.png` | iOS light icon, and the default icon everywhere else |
| `icon-dark.png`, `icon-tinted.png` | iOS dark and tinted icons |
| `android-icon-foreground.png` | Android adaptive icon. It sits on the cream background colour `#F7F1E6`, and the artwork stays inside the safe zone so no launcher shape clips it. |
| `android-icon-monochrome.png` | Android themed (one-colour) icon |
| `splash-icon.png` | Splash screen: the logo and the word on a transparent background, shown on cream `#F7F1E6` |
| `favicon.png` | Web favicon |

The splash image is the first frame of the sign-in intro, so the sign-in screen can carry straight on from it. It is 260 points wide on iOS. On Android it is 210 dp wide, because Android 12 and later keep only a 192 dp circle in the middle of the splash screen and the whole image has to fit inside it.

Icons and the splash are fixed when the native app is built: a change needs a new build, and reloading a running app will not show it. Expo's guidance is to check the splash screen in a preview or production build, because a development build does not show it faithfully.

## The schema

The tested SQL sketch was lost too. The schema was rebuilt from the Database tab as `supabase/migrations/0001_init.sql`, which is now the source of truth; the Database tab describes it. Tests are in `supabase/tests`.
