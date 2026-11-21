import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  sassOptions: {
    // Lets every .module.scss do `@use 'variables' as *;` without relative paths
    loadPaths: [path.join(dirname, 'src/styles')],
  },
};

export default nextConfig;
