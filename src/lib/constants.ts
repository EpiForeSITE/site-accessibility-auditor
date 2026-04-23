export const TARGET_MIN = 24;
export const TARGET_RECOMMENDED = 44;
export const FOCUS_CONTRAST_MIN = 3;

export const INTERACTIVE_SELECTORS = [
	'button',
	'a[href]',
	'input:not([type="hidden"])',
	'select',
	'textarea',
	'summary',
	'[role="button"]',
	'[role="link"]',
	'[role="tab"]',
	'[role="checkbox"]',
	'[role="radio"]',
	'[role="switch"]',
	'[role="menuitem"]',
	'[role="menuitemcheckbox"]',
	'[role="menuitemradio"]',
	'[role="slider"]',
	'[role="combobox"]',
	'[role="option"]',
	'[role="spinbutton"]',
	'[onclick]',
	'[ontouchstart]',
	'[draggable="true"]',
	'[tabindex]:not([tabindex="-1"])',
	'label[for]'
].join(', ');

export const FOCUSABLE_SELECTORS = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled]):not([type="hidden"])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'summary',
	'[tabindex]:not([tabindex="-1"])',
	'[contenteditable="true"]'
].join(', ');

export const DRAG_SURFACE_SELECTORS = [
	'[draggable="true"]',
	'[role="slider"]',
	'[onpointerdown]',
	'[onmousedown]',
	'[data-rbd-draggable-id]',
	'[data-draggable]',
	'.sortable',
	'.draggable',
	'.ui-slider-handle',
	'.swiper-slide'
].join(', ');

export const AUTH_FORM_HINTS = {
	formAction: /(login|signin|sign-in|auth|account|register|signup|password)/i,
	usernameLike: /^(username|user|email|login|account)$/i
};

export const HELP_MECHANISM_SELECTORS = [
	'a[href^="mailto:"]',
	'a[href^="tel:"]',
	'a[href*="contact"]',
	'a[href*="help"]',
	'a[href*="support"]',
	'a[href*="faq"]',
	'[role="link"][aria-label*="help" i]',
	'[role="button"][aria-label*="help" i]',
	'[id*="chat" i]',
	'[class*="chat-widget" i]',
	'[data-help]',
	'[data-support]'
].join(', ');

export const HELP_KIND_PATTERNS: { kind: string; test: RegExp }[] = [
	{ kind: 'email', test: /^mailto:/i },
	{ kind: 'phone', test: /^tel:/i },
	{ kind: 'chat', test: /chat|messenger|intercom/i },
	{ kind: 'faq', test: /faq|kb|knowledge/i },
	{ kind: 'contact', test: /contact/i },
	{ kind: 'help', test: /help|support/i }
];

export const AUTOCOMPLETE_TOKENS = new Set([
	'name',
	'given-name',
	'additional-name',
	'family-name',
	'honorific-prefix',
	'honorific-suffix',
	'nickname',
	'email',
	'username',
	'new-password',
	'current-password',
	'one-time-code',
	'organization-title',
	'organization',
	'street-address',
	'address-line1',
	'address-line2',
	'address-line3',
	'address-level1',
	'address-level2',
	'address-level3',
	'address-level4',
	'country',
	'country-name',
	'postal-code',
	'cc-name',
	'cc-number',
	'cc-exp',
	'cc-csc',
	'bday',
	'sex',
	'tel',
	'tel-national',
	'url'
]);
