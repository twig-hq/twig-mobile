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

## The schema

The tested SQL sketch was lost too. The schema was rebuilt from the Database tab as `supabase/migrations/0001_init.sql`, which is now the source of truth; the Database tab describes it. Tests are in `supabase/tests`.
