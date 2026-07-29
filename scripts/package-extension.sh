#!/bin/sh

set -eu

repository_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
extension_dir="$repository_root/extension"
dist_dir="$repository_root/dist"
version=$(
  sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' \
    "$extension_dir/manifest.json"
)

if [ -z "$version" ]; then
  echo "Unable to read extension version from manifest.json" >&2
  exit 1
fi

archive="$dist_dir/bl-search-extension-v${version}-store.zip"
mkdir -p "$dist_dir"
temporary_dir=$(mktemp -d)
temporary_archive="$temporary_dir/$(basename "$archive")"

(
  cd "$extension_dir"
  zip -q -9 "$temporary_archive" \
    manifest.json \
    config.js \
    background.js \
    storage.js \
    content.js \
    content.css \
    options.html \
    options.js \
    options.css \
    icons/icon16.png \
    icons/icon32.png \
    icons/icon48.png \
    icons/icon128.png
)

entries=$(unzip -Z1 "$temporary_archive")

if ! printf '%s\n' "$entries" | grep -qx "manifest.json"; then
  echo "Package does not contain manifest.json at its root" >&2
  exit 1
fi

if printf '%s\n' "$entries" | grep -Eq '(^|/)(server|test|store)(/|$)|\.(pem|crx)$'; then
  echo "Package contains a prohibited development or private file" >&2
  exit 1
fi

mv -f "$temporary_archive" "$archive"
rmdir "$temporary_dir"

echo "$archive"
