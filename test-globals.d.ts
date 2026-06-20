declare module "vitest" {
  export const describe: (name: string, fn: () => void) => void;
  export const it: (name: string, fn: () => void | Promise<void>) => void;
  export const expect: any;
}

declare module "vitest/config" {
  export function defineConfig(config: unknown): unknown;
}

declare module "react-dom/server" {
  export function renderToStaticMarkup(element: import("react").ReactElement): string;
}
