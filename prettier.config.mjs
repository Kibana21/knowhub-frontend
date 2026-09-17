/**
 * Formatting is mechanically determined and mechanically checkable, so that a
 * deviation is detected by `pnpm format:check` rather than by review opinion
 * (0B-SPEC-001 R24).
 *
 * @type {import('prettier').Config}
 */
const config = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 80,
  tabWidth: 2,
  // Deterministic Tailwind class ordering, so class order is never a review
  // discussion either.
  plugins: ['prettier-plugin-tailwindcss'],
};

export default config;
