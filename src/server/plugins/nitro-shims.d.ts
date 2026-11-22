/**
 * Minimal type shims for Nitro's virtual runtime modules. SolidStart provides
 * these at build time, but they are not part of the project's dependency graph,
 * so TypeScript cannot resolve them on its own.
 */
declare module "nitropack/runtime" {
  export function defineNitroPlugin(
    plugin: (nitro: {
      hooks: {
        hook(name: string, handler: (event: any) => void): void;
      };
    }) => void,
  ): unknown;
}

declare module "h3" {
  export function getResponseStatus(event: any): number;
}
