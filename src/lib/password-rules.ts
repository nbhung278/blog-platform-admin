export type PasswordRule = {
	label: string;
	test: (s: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
	{ label: "At least 12 characters", test: (s) => s.length >= 12 },
	{ label: "One uppercase letter", test: (s) => /[A-Z]/.test(s) },
	{ label: "One lowercase letter", test: (s) => /[a-z]/.test(s) },
	{ label: "One number", test: (s) => /[0-9]/.test(s) },
];

export function isPasswordValid(s: string) {
	return PASSWORD_RULES.every((r) => r.test(s));
}
