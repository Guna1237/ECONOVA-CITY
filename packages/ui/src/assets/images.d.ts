/* Vite resolves these to emitted asset URLs at build time. */
declare module '*.png' {
  const url: string;
  export default url;
}
