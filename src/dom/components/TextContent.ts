import { type DOMElement, DOMElementImpl, type ElementOptions } from "../element";
import { createTextContent } from "../text-content";

/** Mutable text content. @category Components */
export interface TextElement extends DOMElement {
  text: string;
}

/** @internal */
export class TextContentElement extends DOMElementImpl implements TextElement {
  static override _reactiveKeys: ReadonlySet<string> = new Set([
    ...DOMElementImpl._reactiveKeys,
    "text",
  ]);
  private readonly content: ReturnType<typeof createTextContent>;

  constructor(kind: string, root: HTMLElement, text: string, options: ElementOptions) {
    super(kind, root, options);
    const node = document.createTextNode(text);
    root.appendChild(node);
    this.content = createTextContent(node);
    this._registerPropertyRenderer("text", this.content);
  }

  get text(): string {
    return this.content.value;
  }
  set text(value: string) {
    this.content.value = value;
  }
}
