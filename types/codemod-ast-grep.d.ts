declare module "codemod:ast-grep" {
  export type Edit = {
    startPos: number;
    endPos: number;
    insertedText: string;
  };

  export type SgNode<TLang = unknown> = {
    text(): string;
    kind(): string;
    range(): {
      start: { index: number };
      end: { index: number };
    };
    ancestors(): Array<SgNode<TLang>>;
    findAll(query: unknown): Array<SgNode<TLang>>;
    commitEdits(edits: Edit[]): string;
  };

  export type Codemod<TLang = unknown> = (root: {
    root(): SgNode<TLang>;
  }) => Promise<string | null> | string | null;
}

declare module "codemod:ast-grep/langs/python" {
  type Python = unknown;
  export default Python;
}
