// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    // If you're using Create React App structure
    distDir: 'build',
    // Enable standalone output for Vercel
    output: 'standalone'
  }
  
  module.exports = nextConfig