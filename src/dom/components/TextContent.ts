import { DOMElement, type ElementOptions } from "../element";

/** Mutable text content. @category Components */
export interface TextElement extends DOMElement {
  text: string;
}

/** @internal */
export class TextContentElement extends DOMElement implements TextElement {
  static override _reactiveKeys: ReadonlySet<string> = new Set([
    ...DOMElement._reactiveKeys,
    "text",
  ]);
  private readonly textNode: Text;

  constructor(kind: string, root: HTMLElement, text: string, options: ElementOptions) {
    super(kind, root, options);
    this.textNode = document.createTextNode(text);
    root.appendChild(this.textNode);
  }

  get text(): string {
    return this.textNode.data;
  }
  set text(value: string) {
    this.textNode.data = value;
  }
}
