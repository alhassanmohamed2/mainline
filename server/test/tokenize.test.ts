import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CommandSyntaxError, tokenize } from '../src/exec/tokenize.ts';

const words = (input: string) => tokenize(input).map((token) => (token.type === 'word' ? token.value : `<${token.value}>`));

test('splits on whitespace', () => {
  assert.deepEqual(words('git   status  '), ['git', 'status']);
});

test('keeps quoted text together', () => {
  assert.deepEqual(words('git commit -m "Add the Red Line"'), ['git', 'commit', '-m', 'Add the Red Line']);
  assert.deepEqual(words("git commit -m 'it costs $5'"), ['git', 'commit', '-m', 'it costs $5']);
});

test('an apostrophe inside double quotes is literal', () => {
  assert.deepEqual(words(`echo "the city's lines" >> README.md`), ['echo', "the city's lines", '<>>>', 'README.md']);
});

test('joins adjacent quoted and unquoted parts', () => {
  assert.deepEqual(words('git log --format="%h %s"'), ['git', 'log', '--format=%h %s']);
});

test('leaves git revision syntax alone', () => {
  assert.deepEqual(words('git reset --hard HEAD@{1}'), ['git', 'reset', '--hard', 'HEAD@{1}']);
  assert.deepEqual(words('git cat-file -p HEAD^{tree}'), ['git', 'cat-file', '-p', 'HEAD^{tree}']);
  assert.deepEqual(words('git log main..origin/main'), ['git', 'log', 'main..origin/main']);
});

test('recognises shell operators', () => {
  assert.deepEqual(words('git log | head'), ['git', 'log', '<|>', 'head']);
  assert.deepEqual(words('git add . && git commit'), ['git', 'add', '.', '<&&>', 'git', 'commit']);
  assert.deepEqual(words('echo hi > a.txt'), ['echo', 'hi', '<>>', 'a.txt']);
});

test('ignores a trailing comment', () => {
  assert.deepEqual(words('git status # where am I'), ['git', 'status']);
});

test('refuses variables and command substitution', () => {
  assert.throws(() => tokenize('echo $HOME'), CommandSyntaxError);
  assert.throws(() => tokenize('echo "$(whoami)"'), CommandSyntaxError);
  assert.throws(() => tokenize('echo `whoami`'), CommandSyntaxError);
});

test('reports unclosed quotes', () => {
  assert.throws(() => tokenize('git commit -m "oops'), /Unclosed double quote/);
  assert.throws(() => tokenize("git commit -m 'oops"), /Unclosed single quote/);
});
