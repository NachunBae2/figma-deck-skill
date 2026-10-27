#!/usr/bin/env bash
# what:  Merge slide exports (PNG/JPG/PDF, in the given order) into one PDF.
# usage: bin/deck-pdf.sh <file...> -o out.pdf      (pass the files of one export run, e.g. exports/<job>/slides/*.pdf)
# env:   none. Needs pdfunite + pdfinfo (poppler); images are converted with sips (macOS) or ImageMagick (magick).
set -e
OUT=""; FILES=()
while [ $# -gt 0 ]; do case "$1" in -o) OUT="$2"; shift 2;; *) FILES+=("$1"); shift;; esac; done
[ -n "$OUT" ] && [ ${#FILES[@]} -gt 0 ] || { echo "usage: deck-pdf.sh <files...> -o out.pdf"; exit 2; }
command -v pdfunite >/dev/null || { echo "pdfunite not found (install poppler)"; exit 2; }
toPdf() {
  if command -v sips >/dev/null; then sips -s format pdf "$1" --out "$2" >/dev/null
  elif command -v magick >/dev/null; then magick "$1" "$2"
  else echo "need sips (macOS) or ImageMagick to convert $1"; exit 2; fi
}
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT; PDFS=(); n=0
for f in "${FILES[@]}"; do
  case "$(printf '%s' "$f" | tr '[:upper:]' '[:lower:]')" in
    *.pdf) PDFS+=("$f");;
    *.png|*.jpg|*.jpeg) n=$((n+1)); toPdf "$f" "$TMP/$n.pdf"; PDFS+=("$TMP/$n.pdf");;
    *) echo "unsupported file: $f"; exit 2;;
  esac
done
pdfunite "${PDFS[@]}" "$OUT"
echo "$OUT ($(pdfinfo "$OUT" | awk '/^Pages:/{print $2}') pages)"
