import test from 'node:test';
import assert from 'node:assert/strict';
import { signLink, verifyLink } from '../../netlify/lib/tokens.mjs';
process.env.VIEWING_LINK_SECRET = 'a-test-secret-that-is-at-least-32-characters-long';
test('signed link preserves booking scope and revision', () => {
  const expires=Date.now()+60000;
  assert.deepEqual(verifyLink(signLink('booking123',expires,4)),{id:'booking123',expires,version:4});
});
test('tampered, truncated, missing and expired links are rejected', () => {
  const signed=signLink('booking123',Date.now()+60000);
  const [payload,signature]=signed.split('.');
  const tampered=Buffer.from(JSON.stringify({id:'another-booking',expires:Date.now()+60000,version:0})).toString('base64url');
  for (const value of [undefined,'',`${tampered}.${signature}`,`${payload}.tiny`,`${signed}.extra`,signLink('booking123',Date.now()-1000),signLink('../other',Date.now()+60000)]) {
    assert.throws(() => verifyLink(value), e => e.status === 401);
  }
});
