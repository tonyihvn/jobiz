module.exports = {
  plugins: {
    // Use the tailwindcss plugin entrypoint to match the installed Tailwind v3 in your project.
    // Using '@tailwindcss/postcss' requires Tailwind v4 and will mismatch when v3 is installed.
    tailwindcss: {},
    autoprefixer: {},
  }
}
