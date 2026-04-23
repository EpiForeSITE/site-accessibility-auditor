import type { ElementRect } from '../types.ts';
import { wrapPageScript, type RawFinding } from './shared.ts';

export interface AuthFormRaw {
	formIndex: number;
	selector: string | null;
	domPath: string | null;
	rect: ElementRect;
	hasPassword: boolean;
	hasUsernameLike: boolean;
	actionHint: boolean;
	passwordSelector: string | null;
	passwordBlocksPaste: boolean;
	passwordAutocomplete: string | null;
	usernameAutocomplete: string | null;
	hasCaptchaImage: boolean;
	hasCaptchaAlternative: boolean;
	transcriptionPrompts: string[];
	attributes: Record<string, string | null>;
}

export function classifyAuth(raw: AuthFormRaw): RawFinding[] {
	const findings: RawFinding[] = [];
	const issues: string[] = [];
	const fixes: string[] = [];

	if (raw.passwordBlocksPaste) {
		issues.push('password field blocks paste');
		fixes.push('remove onpaste/oncopy preventDefault');
	}
	if (!raw.passwordAutocomplete) {
		issues.push('password field has no autocomplete token');
		fixes.push('add autocomplete="current-password" or "new-password"');
	}
	if (raw.hasUsernameLike && !raw.usernameAutocomplete) {
		issues.push('username/email field has no autocomplete token');
		fixes.push('add autocomplete="username" or "email"');
	}
	if (raw.hasCaptchaImage && !raw.hasCaptchaAlternative) {
		issues.push('CAPTCHA has no non-cognitive alternative');
		fixes.push('provide an audio alternative or a non-puzzle verification method');
	}
	if (raw.transcriptionPrompts.length > 0) {
		issues.push('transcription-style prompts (e.g. "type the characters shown")');
		fixes.push('remove memorization/transcription requirements');
	}

	const status: 'pass' | 'fail' | 'warning' = issues.length === 0 ? 'pass' : 'fail';

	findings.push({
		wcag: '3.3.8',
		status,
		tag: 'form',
		text: 'Authentication form',
		rect: raw.rect,
		selector: raw.selector,
		domPath: raw.domPath,
		attributes: raw.attributes,
		evidence: {
			hasPassword: raw.hasPassword,
			hasUsernameLike: raw.hasUsernameLike,
			actionHint: raw.actionHint,
			passwordBlocksPaste: raw.passwordBlocksPaste,
			passwordAutocomplete: raw.passwordAutocomplete,
			usernameAutocomplete: raw.usernameAutocomplete,
			hasCaptchaImage: raw.hasCaptchaImage,
			hasCaptchaAlternative: raw.hasCaptchaAlternative,
			transcriptionPrompts: raw.transcriptionPrompts,
			issues
		},
		suggestion:
			issues.length === 0
				? 'Authentication form meets WCAG 3.3.8 heuristics: pastable password, autocomplete tokens present, no puzzle-only CAPTCHA, no transcription prompts.'
				: `Authentication barriers detected: ${issues.join('; ')}. Fixes: ${fixes.join('; ')}.`
	});

	return findings;
}

export function buildAccessibleAuthCheck(): string {
	const body = `
function detectPasteBlock(el) {
  if (!el) return false;
  var onpaste = el.getAttribute('onpaste') || '';
  if (/return\\s+false|preventDefault|stopPropagation/i.test(onpaste)) return true;
  if (el.getAttribute('data-disable-paste') === 'true') return true;
  // spellcheck="false" alone is not an issue; we only flag paste disablement.
  return false;
}

var forms = Array.prototype.slice.call(document.querySelectorAll('form'));
if (forms.length === 0) forms = Array.prototype.slice.call(document.querySelectorAll('[role="form"]'));

var raws = [];
for (var fi = 0; fi < forms.length; fi++) {
  var form = forms[fi];
  var pwd = form.querySelector('input[type="password"]');
  var action = (form.getAttribute('action') || form.getAttribute('data-action') || '').toLowerCase();
  var actionHint = /(login|signin|sign-in|auth|register|signup|account|password)/.test(action);

  if (!pwd && !actionHint) continue;

  var usernameLike = null;
  var unInputs = form.querySelectorAll('input[type="text"], input[type="email"], input[name], input[id]');
  for (var u = 0; u < unInputs.length; u++) {
    var ui = unInputs[u];
    var nm = (ui.getAttribute('name') || ui.getAttribute('id') || '').toLowerCase();
    if (/^(username|user|email|login|account)$/.test(nm) || ui.getAttribute('type') === 'email') {
      usernameLike = ui; break;
    }
  }

  var captchaImg = form.querySelector('img[alt*="captcha" i], [class*="captcha" i] img');
  var captchaIframe = form.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"]');
  var hasCaptchaImage = !!captchaImg || !!captchaIframe;
  var hasCaptchaAlternative = false;
  if (hasCaptchaImage) {
    var audio = form.querySelector('audio, button[aria-label*="audio" i], a[href*="audio"]');
    var altMethod = form.querySelector('[data-captcha-alt], [data-alternative]');
    hasCaptchaAlternative = !!audio || !!altMethod;
  }

  var transcription = [];
  var labels = form.querySelectorAll('label, p, legend, .help-text');
  for (var l = 0; l < labels.length; l++) {
    var t = (labels[l].textContent || '').toLowerCase();
    if (/type the (characters|letters|code|text) (shown|above|below)/.test(t) ||
        /enter the code from (your|the) (image|picture)/.test(t) ||
        /copy the (characters|code)/.test(t)) {
      transcription.push((labels[l].textContent || '').trim().substring(0, 80));
    }
  }

  var rect = __audit_rect(form);
  raws.push({
    formIndex: fi,
    selector: __audit_getSelector(form),
    domPath: __audit_getPath(form),
    rect: rect,
    hasPassword: !!pwd,
    hasUsernameLike: !!usernameLike,
    actionHint: actionHint,
    passwordSelector: pwd ? __audit_getSelector(pwd) : null,
    passwordBlocksPaste: pwd ? detectPasteBlock(pwd) : false,
    passwordAutocomplete: pwd ? pwd.getAttribute('autocomplete') : null,
    usernameAutocomplete: usernameLike ? usernameLike.getAttribute('autocomplete') : null,
    hasCaptchaImage: hasCaptchaImage,
    hasCaptchaAlternative: hasCaptchaAlternative,
    transcriptionPrompts: transcription,
    attributes: __audit_attrMap(form)
  });
}
return { raws: raws };
`;
	return wrapPageScript(body);
}

export interface AccessibleAuthPageResult {
	raws: AuthFormRaw[];
	__error?: string;
}
