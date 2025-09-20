/**
 * Type definitions for @xenova/transformers (optional dependency)
 */

declare module '@xenova/transformers' {
  export function pipeline(
    task: string,
    model: string,
    options?: any
  ): Promise<any>;

  export interface PipelineResponse {
    data: Float32Array | number[];
  }
}