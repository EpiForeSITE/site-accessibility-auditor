import { AUTOCOMPLETE_TOKENS } from '../constants.ts';
import type { ElementRect } from '../types.ts';
import { wrapPageScript, type RawFinding } from './shared.ts';

export interface FormFieldRaw {
	index: number;
	formIndex: number;
	tag: string;
	type: string;
	name: string | null;
	id: string | null;
	autocomplete: string | null;
	placeholder: string | null;
	ariaLabel: string | null;
	labelText: string | null;
	defaultValue: string | null;
	readonly: boolean;
	disabled: boolean;
	rect: ElementRect;
	selector: string | null;
	domPath: string | null;
}

export interface RedundantEntryRaw {
	fields: FormFieldRaw[];
}

/**
 * Normalize a field into a cross-form token. Prefers `autocomplete` when
 * it's a valid WCAG-defined token, otherwise falls back to a slug of
 * name/id/placeholder/label.
 */
export function tokenizeField(f: FormFieldRaw, knownTokens: Set<string>): string | null {
	const ac = (f.autocomplete || '').trim().toLowerCase();
	if (ac) {
		// autocomplete may contain multiple tokens like "section-foo billing email"
		const parts = ac.split(/\s+/);
		for (const p of parts) {
			if (knownTokens.has(p)) return p;
		}
	}
	const raw = [f.name, f.id, f.ariaLabel, f.labelText, f.placeholder].find((s) => s && s.length);
	if (!raw) return null;
	return raw
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export interface ClassifyRedundantArgs {
	fields: FormFieldRaw[];
	knownTokens: string[];
}

export function classifyRedundantEntry({ fields, knownTokens }: ClassifyRedundantArgs): {
	findings: RawFinding[];
	emittedTokens: string[];
} {
	const findings: RawFinding[] = [];
	const known = new Set(knownTokens);
	const emitted: string[] = [];

	// In-page clustering: collect token -> field list
	const byToken = new Map<string, FormFieldRaw[]>();
	for (const f of fields) {
		if (f.type === 'password' || f.type === 'hidden') continue;
		if (f.readonly || f.disabled) continue;
		const tok = tokenizeField(f, AUTOCOMPLETE_TOKENS);
		if (!tok) continue;
		if (!byToken.has(tok)) byToken.set(tok, []);
		byToken.get(tok)!.push(f);
		emitted.push(tok);
	}

	// Within-page duplicate fields across different forms without shared autocomplete.
	for (const [tok, group] of byToken) {
		if (group.length < 2) continue;
		const differentForms = new Set(group.map((g) => g.formIndex)).size > 1;
		if (!differentForms) continue;
		const withAutocomplete = group.every((f) => !!f.autocomplete);
		const withDefault = group.every((f) => !!f.defaultValue);
		if (withAutocomplete || withDefault) continue;

		for (const f of group) {
			findings.push({
				wcag: '3.3.7',
				status: 'fail',
				tag: f.tag,
				text: f.labelText || f.placeholder || f.name || tok,
				rect: f.rect,
				selector: f.selector,
				domPath: f.domPath,
				attributes: {
					name: f.name,
					id: f.id,
					autocomplete: f.autocomplete,
					type: f.type
				},
				evidence: {
					token: tok,
					duplicateFieldSelectors: group.filter((g) => g !== f).map((g) => g.selector),
					scope: 'in-page'
				},
				suggestion: `Field "${tok}" appears in multiple forms on this page. Auto-populate via an autocomplete token, a default value, or let the user pick a previous value (WCAG 3.3.7).`
			});
		}
	}

	// Cross-page (session) duplicates.
	for (const f of fields) {
		if (f.type === 'password' || f.type === 'hidden') continue;
		if (f.readonly || f.disabled) continue;
		const tok = tokenizeField(f, AUTOCOMPLETE_TOKENS);
		if (!tok) continue;
		if (!known.has(tok)) continue;
		if (f.defaultValue) continue;
		if (f.autocomplete) continue;
		findings.push({
			wcag: '3.3.7',
			status: 'warning',
			tag: f.tag,
			text: f.labelText || f.placeholder || f.name || tok,
			rect: f.rect,
			selector: f.selector,
			domPath: f.domPath,
			attributes: {
				name: f.name,
				id: f.id,
				autocomplete: f.autocomplete,
				type: f.type
			},
			evidence: { token: tok, scope: 'session', seenOnEarlierPage: true },
			suggestion: `Field "${tok}" was entered on an earlier page in this session but is neither pre-filled nor marked with an autocomplete token. Consider auto-populating it (WCAG 3.3.7).`
		});
	}

	return { findings, emittedTokens: Array.from(new Set(emitted)) };
}

export function buildRedundantEntryCheck(): string {
	const body = `
var forms = Array.prototype.slice.call(document.querySelectorAll('form'));
// Treat forms + loose containers with >1 input as a form-like group.
if (forms.length === 0) forms = [document.body];

var fields = [];
for (var fi = 0; fi < forms.length; fi++) {
  var form = forms[fi];
  var inputs = form.querySelectorAll('input, select, textarea');
  for (var i = 0; i < inputs.length; i++) {
    var el = inputs[i];
    if (!__audit_visible(el)) continue;
    var tag = el.tagName.toLowerCase();
    var type = (el.getAttribute('type') || (tag === 'textarea' ? 'textarea' : 'text')).toLowerCase();
    if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset') continue;
    var labelText = null;
    if (el.id) {
      var lab = document.querySelector('label[for="' + __audit_cssEscape(el.id) + '"]');
      if (lab) labelText = (lab.textContent || '').trim().substring(0, 80);
    }
    if (!labelText) {
      var parentLabel = el.closest ? el.closest('label') : null;
      if (parentLabel) labelText = (parentLabel.textContent || '').trim().substring(0, 80);
    }
    fields.push({
      index: fields.length,
      formIndex: fi,
      tag: tag,
      type: type,
      name: el.getAttribute('name'),
      id: el.id || null,
      autocomplete: el.getAttribute('autocomplete'),
      placeholder: el.getAttribute('placeholder'),
      ariaLabel: el.getAttribute('aria-label'),
      labelText: labelText,
      defaultValue: el.getAttribute('value'),
      readonly: el.hasAttribute('readonly'),
      disabled: el.hasAttribute('disabled'),
      rect: __audit_rect(el),
      selector: __audit_getSelector(el),
      domPath: __audit_getPath(el)
    });
  }
}
return { fields: fields };
`;
	return wrapPageScript(body);
}

export interface RedundantEntryPageResult {
	fields: FormFieldRaw[];
	__error?: string;
}
