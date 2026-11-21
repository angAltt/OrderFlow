import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'out/**'] },
  ...nextCoreWebVitals,
  {
    rules: {
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
];

export default config;
