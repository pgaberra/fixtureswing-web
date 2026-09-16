#!/usr/bin/env bash
#
# The home page must reach a client that runs no JavaScript (search engines, link previews,
# automated site reviews) with its content in the HTML. A prerender that quietly produces an empty
# page breaks nothing a browser would notice, so this reads the built file the way that reader does.
# Run after `npm run build`.
set -euo pipefail

out=dist/fixture-ticker-web/browser

# path|text that only that page's own content contains
checks=(
  "index.html|Which Premier League teams have the easiest fixtures"
)

failed=0
for check in "${checks[@]}"; do
  file="${out}/${check%%|*}"
  text="${check#*|}"
  if [ ! -f "$file" ]; then
    echo "::error::${file} was not prerendered."
    failed=1
    continue
  fi
  visible=$(sed -e 's/<script[^>]*>[^<]*<\/script>//g' -e 's/<[^>]*>/ /g' "$file" | tr -s ' \n' ' ')
  if ! grep -qF -- "$text" <<< "$visible"; then
    echo "::error::${file} does not contain \"${text}\" outside its markup; the prerender rendered no content."
    failed=1
  fi
done

if [ ! -f "${out}/index.csr.html" ]; then
  echo "::error::${out}/index.csr.html is missing; nginx serves it for every client-rendered route."
  failed=1
fi

if [ "$failed" -ne 0 ]; then
  exit 1
fi
echo "The home page is prerendered with its content, and the client-rendered shell exists."
