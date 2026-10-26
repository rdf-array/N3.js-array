const { spawnSync } = require('child_process');
const path = require('path');

// Runs every W3C RDF 1.1 and RDF 1.2 syntax and evaluation suite through the parser
// and through a write round trip, the canonical N-Triples and N-Quads suites through the Writer,
// and the N3 suites through the parser. Extra arguments are passed to every RDF run.
// rdf-array: the W3C RDF suites are read from rdf-tests-array, whose expectations spell
// collections as sequences, under their W3C URLs (so that their assumed base IRIs hold), and the
// shared rdf-tests-contrib suites run the same way; scripts/fetch-rdf-array-tests.sh fetches both.
// The RDF 1.2 XML and semantics suites are out of scope: N3.js has no RDF/XML parser or entailment.
const RDF_TESTS = 'https://w3c.github.io/rdf-tests/rdf/';
const RDF_MANIFESTS = [
  'rdf11/rdf-n-triples', 'rdf11/rdf-n-quads', 'rdf11/rdf-turtle', 'rdf11/rdf-trig',
  'rdf12/rdf-n-triples/syntax', 'rdf12/rdf-n-quads/syntax',
  'rdf12/rdf-turtle/syntax', 'rdf12/rdf-turtle/eval',
  'rdf12/rdf-trig/syntax', 'rdf12/rdf-trig/eval',
].map(suite => `${RDF_TESTS}${suite}/manifest.ttl`);
const RDF_TESTS_ARRAY = ['-m', `${RDF_TESTS}~.rdf-array-tests/rdf-tests-array/rdf/`];
const CONTRIB_TESTS = 'https://rdf-array.github.io/rdf-tests-contrib/rdf/';
const CONTRIB_MANIFESTS = ['rdf-turtle', 'rdf-trig', 'rdf-n-triples', 'rdf-n-quads']
  .map(suite => `${CONTRIB_TESTS}${suite}/manifest.ttl`);
const CONTRIB_TESTS_LOCAL = ['-m', `${CONTRIB_TESTS}~.rdf-array-tests/rdf-tests-contrib/rdf/`];
const N3_TESTS = 'https://w3c-cg.github.io/N3/tests/';
const N3_MANIFESTS = ['manifest-parser', 'manifest-extended'].map(name => `${N3_TESTS}N3Tests/${name}.ttl`);
const RDF_TEST_SUITE = path.join(path.dirname(require.resolve('rdf-test-suite/package.json')), 'bin/Runner.js');

const extraArgs = process.argv.slice(2);
const runs = [];
for (const harness of ['spec/parser.js', 'spec/writer.js']) {
  for (const manifest of RDF_MANIFESTS)
    runs.push([RDF_TEST_SUITE, harness, manifest, '-c', '.rdf-test-suite-cache/', ...RDF_TESTS_ARRAY, ...extraArgs]);
  for (const manifest of CONTRIB_MANIFESTS)
    runs.push([RDF_TEST_SUITE, harness, manifest, '-c', '.rdf-test-suite-cache/', ...CONTRIB_TESTS_LOCAL, ...extraArgs]);
}
runs.push(['spec/c14n.js', ...extraArgs]);
// rdf-array: path2.n3's expected result spells its lists as rdf:first/rdf:rest ladders, and the N3
// suites have no -array fork; the parser reads those lists as sequences
const N3_SKIP = ['--skip', 'cwm_syntax_path2\\.n3$'];
for (const manifest of N3_MANIFESTS)
  runs.push([RDF_TEST_SUITE, 'spec/parser.js', manifest, '-i', '{ "format": "text/n3" }',
    '-m', `${N3_TESTS}~.n3-tests/tests/`, ...N3_SKIP]);

const failures = [];
if (spawnSync('sh', ['scripts/fetch-n3-tests.sh'], { stdio: 'inherit' }).status !== 0)
  failures.push('fetching the N3 suites');
if (spawnSync('sh', ['scripts/fetch-rdf-array-tests.sh'], { stdio: 'inherit' }).status !== 0)
  failures.push('fetching the rdf-array suites');
for (const args of runs) {
  const label = args.slice(args[0] === RDF_TEST_SUITE ? 1 : 0, 3).join(' ');
  console.log(`\n# ${label}`);
  if (spawnSync(process.execPath, args, { stdio: 'inherit' }).status !== 0)
    failures.push(label);
}
console.log(failures.length ? `\nFailed:\n${failures.join('\n')}` : '\nAll suites passed.');
process.exitCode = failures.length ? 1 : 0;
