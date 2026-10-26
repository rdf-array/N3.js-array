#!/bin/sh
# rdf-array: fetch the shared suites the spec runs read instead of the W3C originals:
# rdf-tests-array (the W3C RDF suites with sequences in their expectations) and
# rdf-tests-contrib (the tests every rdf-array implementation shares), both under .rdf-array-tests/.
set -eu

fetch() {
  checkout=".rdf-array-tests/$1"
  if test -d "$checkout/.git"; then
    git -C "$checkout" fetch --quiet --depth 1 origin "$2"
    git -C "$checkout" checkout --quiet --detach FETCH_HEAD
  else
    rm -rf "$checkout"
    git clone --quiet --depth 1 --branch "$2" --filter=blob:none --sparse "https://github.com/rdf-array/$1.git" "$checkout"
    git -C "$checkout" sparse-checkout set --no-cone rdf
  fi
}

fetch rdf-tests-array rdf-sequences
fetch rdf-tests-contrib main
