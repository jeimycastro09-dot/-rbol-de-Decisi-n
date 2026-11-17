declare module 'plotly.js-dist-min' {
  export interface PlotData {
    [key: string]: unknown;
  }
  export interface Layout {
    [key: string]: unknown;
  }
  export interface Config {
    [key: string]: unknown;
  }
  export function react(
    root: HTMLElement | string,
    data: PlotData[],
    layout?: Partial<Layout>,
    config?: Partial<Config>,
  ): Promise<HTMLElement>;
  export function purge(root: HTMLElement | string): void;
}
