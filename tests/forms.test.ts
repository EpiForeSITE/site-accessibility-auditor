import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	classifyRedundantEntry,
	tokenizeField,
	type FormFieldRaw
} from '../src/lib/audit-checks/redundant-entry.ts';
import { classifyAuth, type AuthFormRaw } from '../src/lib/audit-checks/accessible-auth.ts';
import { classifyConsistentHelp } from '../src/lib/audit-checks/consistent-help.ts';
import { AUTOCOMPLETE_TOKENS } from '../src/lib/constants.ts';
import { createMemorySessionStore, type HelpSignature } from '../src/lib/session-store.ts';

function mkField(
	overrides: Partial<FormFieldRaw> & { formIndex: number; name?: string | null }
): FormFieldRaw {
	return {
		index: 0,
		formIndex: overrides.formIndex,
		tag: 'input',
		type: 'text',
		name: overrides.name ?? 'email',
		id: null,
		autocomplete: null,
		placeholder: null,
		ariaLabel: null,
		labelText: null,
		defaultValue: null,
		readonly: false,
		disabled: false,
		rect: { x: 0, y: 0, width: 200, height: 32 },
		selector: null,
		domPath: null,
		...overrides
	};
}

test('tokenizeField prefers valid autocomplete tokens', () => {
	const tok = tokenizeField(
		mkField({ formIndex: 0, autocomplete: 'section-foo email', name: 'em' }),
		AUTOCOMPLETE_TOKENS
	);
	assert.equal(tok, 'email');
});

test('tokenizeField falls back to slugged name', () => {
	const tok = tokenizeField(mkField({ formIndex: 0, name: 'First Name' }), AUTOCOMPLETE_TOKENS);
	assert.equal(tok, 'first-name');
});

test('3.3.7: duplicate email in two forms without autocomplete -> two fail findings', () => {
	const fields = [
		mkField({ formIndex: 0, name: 'email', type: 'email' }),
		mkField({ formIndex: 1, name: 'email', type: 'email' })
	];
	const { findings } = classifyRedundantEntry({ fields, knownTokens: [] });
	const fails = findings.filter((f) => f.status === 'fail' && f.wcag === '3.3.7');
	assert.equal(fails.length, 2);
});

test('3.3.7: autocomplete present suppresses in-page duplicate finding', () => {
	const fields = [
		mkField({ formIndex: 0, name: 'email', autocomplete: 'email' }),
		mkField({ formIndex: 1, name: 'email', autocomplete: 'email' })
	];
	const { findings } = classifyRedundantEntry({ fields, knownTokens: [] });
	assert.equal(findings.length, 0);
});

test('3.3.7: session-known token without autocomplete -> warning', () => {
	const fields = [mkField({ formIndex: 0, name: 'email' })];
	const { findings } = classifyRedundantEntry({ fields, knownTokens: ['email'] });
	assert.equal(findings.filter((f) => f.status === 'warning').length, 1);
});

function mkAuth(overrides: Partial<AuthFormRaw>): AuthFormRaw {
	return {
		formIndex: 0,
		selector: 'form',
		domPath: 'form',
		rect: { x: 0, y: 0, width: 300, height: 200 },
		hasPassword: true,
		hasUsernameLike: true,
		actionHint: true,
		passwordSelector: 'input[type=password]',
		passwordBlocksPaste: false,
		passwordAutocomplete: 'current-password',
		usernameAutocomplete: 'username',
		hasCaptchaImage: false,
		hasCaptchaAlternative: false,
		transcriptionPrompts: [],
		attributes: {},
		...overrides
	};
}

test('3.3.8: clean auth form passes', () => {
	const f = classifyAuth(mkAuth({}));
	assert.equal(f[0].status, 'pass');
});

test('3.3.8: paste-blocked password fails', () => {
	const f = classifyAuth(mkAuth({ passwordBlocksPaste: true }));
	assert.equal(f[0].status, 'fail');
	assert.ok(
		(f[0].evidence as { issues: string[] }).issues.some((s) => s.includes('blocks paste')),
		'blocks paste noted'
	);
});

test('3.3.8: missing password autocomplete fails', () => {
	const f = classifyAuth(mkAuth({ passwordAutocomplete: null }));
	assert.equal(f[0].status, 'fail');
});

test('3.3.8: captcha image without alternative fails', () => {
	const f = classifyAuth(mkAuth({ hasCaptchaImage: true, hasCaptchaAlternative: false }));
	assert.equal(f[0].status, 'fail');
	assert.ok(
		(f[0].evidence as { issues: string[] }).issues.some((s) => s.includes('CAPTCHA')),
		'captcha issue'
	);
});

test('3.3.8: transcription prompts flagged', () => {
	const f = classifyAuth(mkAuth({ transcriptionPrompts: ['Type the characters shown above'] }));
	assert.equal(f[0].status, 'fail');
});

test('3.2.6: matching help signatures produce no findings', () => {
	const prior: HelpSignature[] = [
		{
			url: 'https://ex.com/a',
			timestamp: '2026-01-01T00:00:00Z',
			mechanisms: [{ kind: 'email', region: 'footer', text: 'help', href: 'mailto:help@ex.com' }]
		}
	];
	const current: HelpSignature = {
		url: 'https://ex.com/b',
		timestamp: '2026-01-02T00:00:00Z',
		mechanisms: [{ kind: 'email', region: 'footer', text: 'help', href: 'mailto:help@ex.com' }]
	};
	const { findings } = classifyConsistentHelp(current, prior);
	assert.equal(findings.length, 0);
});

test('3.2.6: help mechanism moved to different region flagged', () => {
	const prior: HelpSignature[] = [
		{
			url: 'https://ex.com/a',
			timestamp: '2026-01-01T00:00:00Z',
			mechanisms: [{ kind: 'email', region: 'footer', text: 'help', href: 'mailto:help@ex.com' }]
		}
	];
	const current: HelpSignature = {
		url: 'https://ex.com/b',
		timestamp: '2026-01-02T00:00:00Z',
		mechanisms: [{ kind: 'email', region: 'header', text: 'help', href: 'mailto:help@ex.com' }]
	};
	const { findings } = classifyConsistentHelp(current, prior);
	assert.equal(findings.length, 1);
	assert.equal(findings[0].status, 'warning');
	assert.equal(findings[0].wcag, '3.2.6');
});

test('3.2.6: missing mechanism on new page flagged', () => {
	const prior: HelpSignature[] = [
		{
			url: 'https://ex.com/a',
			timestamp: '2026-01-01T00:00:00Z',
			mechanisms: [
				{ kind: 'email', region: 'footer', text: 'help', href: 'mailto:help@ex.com' },
				{ kind: 'chat', region: 'sticky', text: 'chat', href: null }
			]
		}
	];
	const current: HelpSignature = {
		url: 'https://ex.com/b',
		timestamp: '2026-01-02T00:00:00Z',
		mechanisms: [{ kind: 'email', region: 'footer', text: 'help', href: 'mailto:help@ex.com' }]
	};
	const { findings } = classifyConsistentHelp(current, prior);
	assert.equal(findings.length, 1);
	assert.ok(
		(findings[0].evidence as { differences: string[] }).differences.some((d) => d.includes('chat'))
	);
});

test('SessionStore: in-memory round-trip', async () => {
	const store = createMemorySessionStore();
	await store.recordFieldTokens('https://ex.com', ['email', 'username']);
	const tokens = await store.getKnownFieldTokens('https://ex.com');
	assert.deepEqual(tokens.sort(), ['email', 'username']);
	await store.appendHelpSignature('https://ex.com', {
		url: 'https://ex.com/a',
		timestamp: 't',
		mechanisms: []
	});
	const sigs = await store.getHelpSignatures('https://ex.com');
	assert.equal(sigs.length, 1);
	await store.reset('https://ex.com');
	assert.equal((await store.getHelpSignatures('https://ex.com')).length, 0);
	assert.equal((await store.getKnownFieldTokens('https://ex.com')).length, 0);
});
