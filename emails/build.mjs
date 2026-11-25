// Builds the sign-in emails from emails/src into emails/out.
//
//   node emails/build.mjs                  a preview with a sample code, pictures from ./images
//   node emails/build.mjs https://…/email  ready to paste into Supabase, pictures from that address
//
// Email apps only show pictures that are on the public web, so the second
// form needs the address of a folder where emails/images has been uploaded.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const images = process.argv[2]?.replace(/\/$/, '');
const preview = !images;
const read = (name) => readFileSync(join(here, 'src', name), 'utf8');
const frame = read('_frame.html');
const code = read('_code.html').trimEnd();

mkdirSync(join(here, 'out'), { recursive: true });
for (const name of ['welcome', 'sign-in']) {
  const source = read(`${name}.html`);
  const note = (key) => source.match(new RegExp(`<!-- ${key}: (.*?) -->`))?.[1] ?? '';
  const body = source.replace(/<!--.*?-->\n/g, '').replace('%CODE%', code).trimEnd();
  let html = frame
    .replace('%TITLE%', note('subject'))
    .replace('%PREHEADER%', note('preheader'))
    .replace('%BODY%', body)
    .replaceAll('%IMAGES%', preview ? '../images' : images);
  if (preview) html = html.replaceAll('{{ .Token }}', '482916').replaceAll('{{ .Email }}', 'sam@example.com');
  writeFileSync(join(here, 'out', `${name}.html`), html);
  console.log(`${name}.html  subject: ${note('subject')}`);
}
console.log(preview ? 'Preview built: open emails/out/*.html in a browser.' : `Built for pictures at ${images}`);
