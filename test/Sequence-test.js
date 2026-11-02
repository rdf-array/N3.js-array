import {
  Sequence, Undef, Quad,
  Store, StreamParser, Writer, Parser, Util, DataFactory,
  termFromId, termToId,
} from '../src';

const { namedNode, literal, blankNode, quad, sequence } = DataFactory;

// rdf-array: a sequence is an ordered collection of terms that is itself a term.
describe('Sequence', () => {
  describe('The Sequence module', () => {
    it('should be a function', () => {
      expect(Sequence).toBeInstanceOf(Function);
    });

    it('should be a Sequence constructor', () => {
      expect(new Sequence([])).toBeInstanceOf(Sequence);
    });
  });

  describe('A Sequence instance', () => {
    const seq = new Sequence([namedNode('http://a'), literal('x'), literal(1)]);

    it('should be empty when created without elements', () => {
      expect(new Sequence().length).toBe(0);
      expect(sequence().elements).toEqual([]);
      expect(sequence().value).toBe('()');
    });

    it('should have termType Sequence', () => {
      expect(seq.termType).toBe('Sequence');
    });

    it('should have its elements in order', () => {
      expect(seq.elements.map(e => e.termType)).toEqual(['NamedNode', 'Literal', 'Literal']);
      expect(seq.length).toBe(3);
      expect(seq.elements[2].value).toBe('1');
    });

    it('should have a value that lists its elements', () => {
      expect(seq.value).toBe('(<http://a> "x" "1"^^<http://www.w3.org/2001/XMLSchema#integer>)');
      expect(seq.id).toBe('(["http://a","\\"x\\"","\\"1\\"^^http://www.w3.org/2001/XMLSchema#integer"])');
    });

    it('should spell every kind of element like N-Triples in its value', () => {
      const all = new Sequence([
        blankNode('b'), DataFactory.variable('v'), DataFactory.defaultGraph(),
        literal('q"b\\s\nn\rr'), literal('x', 'en'), literal('x', { language: 'en', direction: 'ltr' }),
        new Sequence([namedNode('http://a'), new Sequence()]),
        quad(namedNode('s'), namedNode('p'), literal('o')),
        quad(namedNode('s'), namedNode('p'), literal('o'), namedNode('g')),
      ]);
      expect(all.value).toBe('(_:b ?v  "q\\"b\\\\s\\nn\\rr" "x"@en "x"@en--ltr (<http://a> ()) <<<s> <p> "o">> <<<s> <p> "o" <g>>>)');
    });

    it('should equal a sequence of equal elements', () => {
      expect(seq.equals(new Sequence([namedNode('http://a'), literal('x'), literal(1)]))).toBe(true);
      expect(seq.equals(sequence([namedNode('http://a'), literal('x'), literal(1)]))).toBe(true);
    });

    it('should not equal a sequence of other elements, another order, or another length', () => {
      expect(seq.equals(new Sequence([namedNode('http://a'), literal('x')]))).toBe(false);
      expect(seq.equals(new Sequence([literal('x'), namedNode('http://a'), literal(1)]))).toBe(false);
      expect(seq.equals(new Sequence([namedNode('http://a'), literal('y'), literal(1)]))).toBe(false);
    });

    it('should not equal other kinds of term', () => {
      expect(seq.equals(namedNode('http://a'))).toBe(false);
      expect(new Sequence([]).equals(namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil'))).toBe(false);
      expect(seq.equals(null)).toBe(false);
    });

    it('should equal a sequence from another library', () => {
      const other = { termType: 'Sequence', elements: [namedNode('http://a'), literal('x'), literal(1)] };
      expect(seq.equals(other)).toBe(true);
    });

    it('should not equal a sequence from another library with other elements or length', () => {
      expect(seq.equals({ termType: 'Sequence', elements: [namedNode('http://a'), literal('x')] })).toBe(false);
      expect(seq.equals({ termType: 'Sequence', elements: [namedNode('http://a'), literal('y'), literal(1)] })).toBe(false);
      expect(seq.equals({ termType: 'Sequence' })).toBe(false);
    });

    it('should nest', () => {
      const nested = new Sequence([seq, new Sequence([])]);
      expect(nested.length).toBe(2);
      expect(nested.elements[0].equals(seq)).toBe(true);
      expect(nested.elements[1].length).toBe(0);
    });

    it('should hold quads (triple terms)', () => {
      const q = quad(namedNode('http://s'), namedNode('http://p'), namedNode('http://o'));
      const s = new Sequence([q]);
      expect(s.elements[0]).toBeInstanceOf(Quad);
      expect(termFromId(termToId(s)).equals(s)).toBe(true);
    });

    it('should have a JSON representation', () => {
      expect(new Sequence([literal('x')]).toJSON()).toEqual({
        termType: 'Sequence',
        value: '("x")',
        elements: [{ termType: 'Literal', value: 'x', language: '', direction: '', datatype: { termType: 'NamedNode', value: 'http://www.w3.org/2001/XMLSchema#string' } }],
      });
    });
  });

  describe('A Sequence of terms from another library', () => {
    const foreign = { termType: 'NamedNode', value: 'http://example.org/a', equals: other => other.termType === 'NamedNode' && other.value === 'http://example.org/a' };

    it('should have a JSON representation listing the elements', () => {
      expect(new Sequence([foreign, literal('1')]).toJSON()).toEqual({
        termType: 'Sequence',
        value: '(<http://example.org/a> "1")',
        elements: [
          { termType: 'NamedNode', value: 'http://example.org/a' },
          { termType: 'Literal', value: '1', language: '', direction: '', datatype: { termType: 'NamedNode', value: 'http://www.w3.org/2001/XMLSchema#string' } },
        ],
      });
    });
  });

  describe('ids', () => {
    it('should round-trip through termToId and termFromId', () => {
      const seq = sequence([namedNode('http://a'), literal('x', 'en'), blankNode('b'), sequence([])]);
      const id = termToId(seq);
      expect(id[0]).toBe('(');
      const back = termFromId(id);
      expect(back).toBeInstanceOf(Sequence);
      expect(back.equals(seq)).toBe(true);
      expect(back.elements[3]).toBeInstanceOf(Sequence);
    });

    it('should give the id of a sequence from another library', () => {
      const other = { termType: 'Sequence', elements: [namedNode('http://a')] };
      expect(termToId(other)).toBe('(["http://a"])');
      expect(DataFactory.fromTerm(other)).toBeInstanceOf(Sequence);
    });
  });

  describe('A factory without sequence()', () => {
    const plain = { ...DataFactory, sequence: undefined };

    it('should make termFromId create a Sequence', () => {
      const term = termFromId('(["http://example.org/a","\\"1\\""])', plain);
      expect(term).toBeInstanceOf(Sequence);
      expect(term.elements).toEqual([namedNode('http://example.org/a'), literal('1')]);
    });

    it('should make the parser create a Sequence', () => {
      const [parsed] = new Parser({ factory: plain }).parse('<a> <b> (<c> 1).');
      expect(parsed.object).toBeInstanceOf(Sequence);
      expect(parsed.object.elements).toEqual([namedNode('c'), literal(1)]);
    });
  });

  describe('Util', () => {
    it('should recognize sequences', () => {
      expect(Util.isSequence(sequence([]))).toBe(true);
      expect(Util.isSequence(namedNode('http://a'))).toBe(false);
      expect(Util.isNamedNode(sequence([]))).toBe(false);
    });
  });

  describe('Store', () => {
    it('should store and find quads with sequence objects and subjects', () => {
      const store = new Store();
      const s = sequence([literal(1), literal(2)]);
      store.addQuad(namedNode('http://x'), namedNode('http://p'), s);
      store.addQuad(s, namedNode('http://q'), literal('tail'));
      expect(store.size).toBe(2);
      const found = store.getQuads(namedNode('http://x'), null, null, null);
      expect(found).toHaveLength(1);
      expect(found[0].object).toBeInstanceOf(Sequence);
      expect(found[0].object.equals(s)).toBe(true);
      // An equal sequence built separately matches
      expect(store.getQuads(null, null, sequence([literal(1), literal(2)]), null)).toHaveLength(1);
      expect(store.getQuads(sequence([literal(1), literal(2)]), null, null, null)).toHaveLength(1);
      expect(store.getQuads(null, null, sequence([literal(2), literal(1)]), null)).toHaveLength(0);
      expect(store.getObjects(namedNode('http://x'), null, null)[0].equals(s)).toBe(true);
    });
  });

  describe('Writer', () => {
    function written(writer) {
      return new Promise((resolve, reject) => writer.end((error, output) => error ? reject(error) : resolve(output)));
    }

    it('should write sequences as ( ... )', async () => {
      const writer = new Writer({ format: 'N-Triples' });
      writer.addQuad(namedNode('http://x'), namedNode('http://p'),
        sequence([literal(1), sequence([namedNode('http://y'), literal('s')]), sequence([])]));
      expect(await written(writer)).toBe('<http://x> <http://p> ("1"^^<http://www.w3.org/2001/XMLSchema#integer> (<http://y> "s") ()) .\n');
    });

    it('should write a sequence subject in Turtle', async () => {
      const writer = new Writer({ prefixes: { ex: 'http://ex/' } });
      writer.addQuad(sequence([namedNode('http://ex/a')]), namedNode('http://ex/p'), namedNode('http://ex/o'));
      expect(await written(writer)).toBe('@prefix ex: <http://ex/>.\n\n(ex:a) ex:p ex:o.\n');
    });

    it('should write a sequence predicate in N3', async () => {
      const writer = new Writer({ format: 'text/n3' });
      writer.addQuad(namedNode('http://s'), sequence([namedNode('http://p')]), namedNode('http://o'));
      expect(await written(writer)).toBe('<http://s> (<http://p>) <http://o>.\n');
    });

    it('should round-trip through the parser', async () => {
      const original = quad(namedNode('http://x'), namedNode('http://p'),
        sequence([literal(1), sequence([namedNode('http://y')]), sequence([])]));
      const writer = new Writer({ format: 'N-Triples' });
      writer.addQuad(original);
      const quads = new Parser().parse(await written(writer));
      expect(quads).toHaveLength(1);
      expect(quads[0].equals(original)).toBe(true);
    });
  });

  describe('Parser', () => {
    function parse(text) {
      return new Parser({ baseIRI: 'http://example.org/' }).parse(text);
    }

    it('should parse an object list as one sequence term', () => {
      const quads = parse('<a> <b> (1 "x" <c>).');
      expect(quads).toHaveLength(1);
      const o = quads[0].object;
      expect(o.termType).toBe('Sequence');
      expect(o.elements.map(e => e.value)).toEqual(['1', 'x', 'http://example.org/c']);
    });

    it('should parse () as the empty sequence, not rdf:nil', () => {
      const quads = parse('<a> <b> ().');
      expect(quads[0].object.termType).toBe('Sequence');
      expect(quads[0].object.length).toBe(0);
    });

    it('should parse nested sequences and blank node property lists in sequences', () => {
      const quads = parse('<a> <b> ((1 2) [ <p> 3 ] ()).');
      expect(quads).toHaveLength(2);
      const main = quads.find(q => q.subject.value === 'http://example.org/a');
      const inner = quads.find(q => q.predicate.value === 'http://example.org/p');
      expect(main.object.length).toBe(3);
      expect(main.object.elements[0].termType).toBe('Sequence');
      expect(main.object.elements[0].elements.map(e => e.value)).toEqual(['1', '2']);
      expect(main.object.elements[1].termType).toBe('BlankNode');
      expect(main.object.elements[1].equals(inner.subject)).toBe(true);
      expect(main.object.elements[2].length).toBe(0);
    });

    it('should parse a sequence subject', () => {
      const quads = parse('(<x> <y>) <a> <b>.');
      expect(quads).toHaveLength(1);
      expect(quads[0].subject.termType).toBe('Sequence');
      expect(quads[0].subject.elements.map(e => e.value)).toEqual(['http://example.org/x', 'http://example.org/y']);
    });

    it('should parse sequences in N-Triples and TriG', () => {
      const nt = new Parser({ format: 'N-Triples' }).parse('<http://a> <http://b> ("x" <http://c>) .');
      expect(nt[0].object.termType).toBe('Sequence');
      const trig = new Parser({ format: 'TriG' }).parse('<http://g> { <http://a> <http://b> (1 2) }');
      expect(trig[0].object.length).toBe(2);
      expect(trig[0].graph.value).toBe('http://g');
    });

    it('should parse a triple term inside a sequence', () => {
      const quads = new Parser({ format: 'Turtle' }).parse('<http://a> <http://b> (<<( <http://s> <http://p> <http://o> )>>).');
      expect(quads).toHaveLength(1);
      expect(quads[0].object.elements[0].termType).toBe('Quad');
    });

    it('should not produce rdf:first or rdf:rest', () => {
      const quads = parse('<a> <b> (1 (2 3) [ <p> (4) ]).');
      expect(quads.some(q => q.predicate.value.endsWith('#first') || q.predicate.value.endsWith('#rest'))).toBe(false);
    });
  });

  describe('rdf-undef: the empty slot', () => {
    const { undef, variable } = DataFactory;
    const s = namedNode('http://example.org/s'), p = namedNode('http://example.org/p');
    const one = literal('1', namedNode('http://www.w3.org/2001/XMLSchema#integer'));
    const PREFIX = 'PREFIX : <http://example.org/>\n';
    function parse(text, format) {
      return new Parser({ format }).parse(text);
    }
    function objectOf(text, format) {
      return parse(text, format)[0].object;
    }

    it('should be one object, an element and not a value', () => {
      expect(undef()).toBe(undef());
      expect(undef()).toBeInstanceOf(Undef);
      expect(undef().termType).toBe('Undef');
      expect(undef().value).toBe('undef');
      expect(undef().equals(undef())).toBe(true);
      expect(undef().equals({ termType: 'Undef', value: 'undef' })).toBe(true);
      expect(undef().equals(namedNode('undef'))).toBe(false);
      expect(namedNode('undef').equals(undef())).toBe(false);
      expect(Util.isUndef(undef())).toBe(true);
      expect(Util.isUndef(s)).toBe(false);
      expect(Util.isUndef(null)).toBe(false);
    });

    it('should be refused by a quad at every position', () => {
      for (const args of [[undef(), p, s], [s, undef(), s], [s, p, undef()], [s, p, s, undef()]])
        expect(() => quad(...args)).toThrow('undef is only a member of a sequence');
    });

    it('should count in length and equality, and spell undef', () => {
      const seq = sequence([one, undef()]);
      expect(seq.length).toBe(2);
      expect(seq.value).toBe('("1"^^<http://www.w3.org/2001/XMLSchema#integer> undef)');
      expect(seq.equals(sequence([one, undef()]))).toBe(true);
      expect(seq.equals(sequence([one]))).toBe(false);
      expect(seq.equals(sequence([undef(), one]))).toBe(false);
      expect(seq.equals(sequence([one, one]))).toBe(false);
      expect(seq.equals({ termType: 'Sequence', elements: [one, { termType: 'Undef', value: 'undef', equals: () => true }] })).toBe(true);
    });

    it('should round trip through ids, and from another library', () => {
      const seq = sequence([undef(), sequence([undef()])]);
      expect(termFromId(termToId(seq)).equals(seq)).toBe(true);
      const factory = { sequence: elements => elements, undef: () => 'slot', defaultGraph: () => null };
      expect(termFromId(termToId(sequence([undef()])), factory)).toEqual(['slot']);
      expect(termFromId(termToId(sequence([undef()])), { sequence: elements => elements })).toEqual([undef()]);
      expect(termToId({ termType: 'Undef', value: 'undef' })).toBe('!undef');
      expect(DataFactory.fromTerm({ termType: 'Undef', value: 'undef' })).toBe(undef());
      expect(DataFactory.fromTerm({ termType: 'Sequence', elements: [{ termType: 'Undef', value: 'undef' }] }).equals(sequence([undef()]))).toBe(true);
    });

    it('should be read in any case, at any depth', () => {
      expect(objectOf(`${PREFIX}:s :p (1 UNDEF Undef undef) .`).elements.map(e => e.termType))
        .toEqual(['Literal', 'Undef', 'Undef', 'Undef']);
      expect(parse(`${PREFIX}(undef (undef 1)) :p 2 .`)[0].subject.elements[1].elements[0]).toBe(undef());
      expect(objectOf(`${PREFIX}:s :p (undef(undef)undef) .`).value).toBe('(undef (undef) undef)');
    });

    it('should read undef:x as a prefixed name', () => {
      const e = objectOf('PREFIX undef: <http://example.org/>\nundef:s undef:p (undef:o undef undef:) .').elements;
      expect(e[0].value).toBe('http://example.org/o');
      expect(e[1]).toBe(undef());
      expect(e[2].value).toBe('http://example.org/');
    });

    it('should be read in N-Triples and N-Quads', () => {
      expect(objectOf('<http://s> <http://p> ( "a" undef ( UNDEF ) ) .', 'application/n-triples').value).toBe('("a" undef (undef))');
      const [q] = parse('<http://s> <http://p> ( undef ) <http://g> .', 'application/n-quads');
      expect(q.object.elements[0]).toBe(undef());
      expect(q.graph.value).toBe('http://g');
    });

    it('should be read split across chunks', async () => {
      const quads = [];
      const parser = new StreamParser();
      parser.on('data', q => quads.push(q));
      const ended = new Promise(resolve => parser.on('end', resolve));
      parser.write(`${PREFIX}:s :p (un`);
      parser.write('def');
      parser.write(' ) .');
      parser.end();
      await ended;
      expect(quads[0].object.elements[0]).toBe(undef());
    });

    it('should not be read outside a sequence', () => {
      for (const text of [':s :p undef .', 'undef :p 1 .', ':s undef :o .', ':s :p (1) , undef .', ':s :p ( [ :q undef ] ) .', ':s :p ( undefined ) .', ':s :p undef'])
        expect(() => parse(PREFIX + text)).toThrow();
      expect(() => parse('<http://s> <http://p> undef .', 'application/n-triples')).toThrow();
      expect(() => parse('undef <http://p> <http://o> .', 'application/n-triples')).toThrow();
      expect(() => parse('<http://s> undef <http://o> .', 'application/n-triples')).toThrow();
      expect(() => parse('<http://s> <http://p> <http://o> undef .', 'application/n-quads')).toThrow();
      expect(() => parse(`${PREFIX}undef { :s :p :o }`, 'application/trig')).toThrow();
    });

    it('should use a parser factory\'s undef, or the default one', () => {
      const factory = { ...DataFactory, undef: () => 'slot', sequence: elements => ({ termType: 'Sequence', elements }) };
      const without = { ...DataFactory, undef: undefined };
      expect(new Parser({ factory }).parse(`${PREFIX}:s :p (undef) .`)[0]).toBeDefined();
      expect(new Parser({ factory: without }).parse(`${PREFIX}:s :p (undef) .`)[0].object.elements[0]).toBe(undef());
    });

    it('should be written, and read back', () => {
      const data = quad(s, p, sequence([one, undef(), sequence([undef()])]));
      for (const format of ['text/turtle', 'application/trig', 'application/n-triples', 'application/n-quads']) {
        const writer = new Writer({ format });
        let text;
        writer.addQuad(data);
        writer.end((e, r) => { text = r; });
        expect(text).toContain('undef');
        expect(parse(text, format)[0].object.equals(data.object)).toBe(true);
      }
    });

    it('should be written by writer.list', () => {
      expect(new Writer().list([one, undef()]).id).toBe('(1 undef)');
    });

    it('should not be written outside a sequence', () => {
      expect(() => new Writer().quadToString(s, p, undef())).toThrow();
    });

    it('should be held in a store', () => {
      const store = new Store();
      store.addQuad(quad(s, p, sequence([one, undef()])));
      expect(store.getQuads(s, p, sequence([one, undef()]))).toHaveLength(1);
      expect(store.getQuads(s, p, sequence([one, one]))).toHaveLength(0);
      expect(store.getQuads(s, p, null)[0].object.elements[1]).toBe(undef());
      expect(variable('undef').termType).toBe('Variable');
    });
  });
});
