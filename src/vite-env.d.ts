/// <reference types="vite/client" />

declare module 'bpmn-js/lib/NavigatedViewer' {
  export default class BpmnViewer {
    constructor(options: { container: HTMLElement });
    importXML(xml: string): Promise<{ warnings: unknown[] }>;
    destroy(): void;
    get(service: 'canvas'): {
      zoom(value: 'fit-viewport' | number): void;
      addMarker(elementId: string, marker: string): void;
      removeMarker(elementId: string, marker: string): void;
    };
    get(service: 'eventBus'): {
      on(eventName: string, callback: (event: { element?: { id?: string } }) => void): void;
    };
  }
}
