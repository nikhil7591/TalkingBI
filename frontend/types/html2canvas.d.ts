declare module "html2canvas" {
  type Html2CanvasOptions = {
    backgroundColor?: string | null;
    useCORS?: boolean;
    scale?: number;
  };

  export default function html2canvas(
    element: HTMLElement,
    options?: Html2CanvasOptions
  ): Promise<HTMLCanvasElement>;
}
