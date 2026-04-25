/// <reference path="../types/codemod-ast-grep.d.ts" />
import type { Codemod, Edit } from "codemod:ast-grep";
import type { SgNode } from "codemod:ast-grep";
import type Python from "codemod:ast-grep/langs/python";

/**
 * web3.py v6 → v7 Migration Codemod
 *
 * Handles all breaking changes from the v6 to v7 migration:
 * - Middleware class renames and removals
 * - WebSocketProvider deprecation
 * - Type renames (CallOverride → StateOverride)
 * - API renames (encodeABI → encode_abi, SolidityError → ContractLogicError)
 * - Attribute renames (middlewares → middleware)
 * - Module removals (EthPM, LRU, geth.miner)
 */
interface Replacement {
  old: string;
  new: string;
}

const STRING_REPLACEMENTS: Replacement[] = [
  // WebSocketProvider
  { old: "WebsocketProviderV2", new: "WebSocketProvider" },

  // API renames
  { old: "SolidityError", new: "ContractLogicError" },
];

const codemod: Codemod<Python> = async (root) => {
  const rootNode = root.root();
  const sourceText = rootNode.text();
  const edits: Edit[] = [];
  const editRanges = new Set<string>();
  const controlFlowMinerTodoStarts = new Set<number>();
  const controlFlowPersonalTodoStarts = new Set<number>();
  let hasChanges = false;

  const addEdit = (startPos: number, endPos: number, insertedText: string) => {
    const key = `${startPos}:${endPos}`;
    if (editRanges.has(key)) {
      return;
    }
    editRanges.add(key);
    edits.push({ startPos, endPos, insertedText });
    hasChanges = true;
  };

  const getLineIndentAt = (index: number): string => {
    const lineStart = sourceText.lastIndexOf("\n", Math.max(index - 1, 0)) + 1;
    let cursor = lineStart;
    while (cursor < sourceText.length) {
      const ch = sourceText[cursor];
      if (ch !== " " && ch !== "\t") {
        break;
      }
      cursor += 1;
    }
    return sourceText.slice(lineStart, cursor);
  };

  const hasWeb3Import = rootNode.findAll({
    rule: {
      any: [
        { pattern: "import web3" },
        { pattern: "import web3 as $ALIAS" },
        { pattern: "import web3.$MODULE" },
        { pattern: "import web3.$MODULE as $ALIAS" },
        { pattern: "from web3 import $NAMES" },
        { pattern: "from web3.$MODULE import $NAMES" },
      ],
    },
  }).length > 0;

  const hasWeb3SymbolUsage = rootNode.findAll({
    rule: {
      any: [
        { pattern: "w3.middleware_onion" },
      ],
    },
  }).length > 0;

  const hasWeb3Context = hasWeb3Import || hasWeb3SymbolUsage;

  // Middleware function → class renames (v6 function-based → v7 class-based model)
  const middlewareIdentifierMap: Record<string, string> = {
    name_to_address_middleware: "ENSNameToAddressMiddleware",
    geth_poa_middleware: "ExtraDataToPOAMiddleware",
    pythonic_middleware: "PythonicMiddleware",
    attrdict_middleware: "AttrDictMiddleware",
    gas_price_strategy_middleware: "GasPriceStrategyMiddleware",
    validation_middleware: "ValidationMiddleware",
    formatting_middleware: "FormattingMiddleware",
    local_filter_middleware: "LocalFilterMiddleware",
  };
  const shouldRenameMiddlewareIdentifier = (node: SgNode<Python>): boolean => {
    const inWeb3MiddlewareImport = node
      .ancestors()
      .find((a) => a.kind() === "import_from_statement")
      ?.text()
      .startsWith("from web3.middleware import");
    if (inWeb3MiddlewareImport) {
      return true;
    }

    const inMiddlewareInjectCall = node
      .ancestors()
      .find((a) => a.kind() === "call")
      ?.text()
      .includes(".middleware_onion.inject(");
    return Boolean(inMiddlewareInjectCall);
  };

  const shouldRenameCallOverrideIdentifier = (node: SgNode<Python>): boolean => {
    const importFrom = node.ancestors().find((a) => a.kind() === "import_from_statement");
    if (importFrom?.text().startsWith("from web3.types import")) {
      return true;
    }

    // Avoid rewriting type alias/definition targets like "CallOverride = ..."
    const assignment = node.ancestors().find((a) => a.kind() === "assignment");
    if (assignment) {
      const assignText = assignment.text();
      const eqPos = assignText.indexOf("=");
      if (eqPos >= 0) {
        const lhs = assignText.slice(0, eqPos).trim();
        if (lhs === "CallOverride") {
          return false;
        }
      }
    }

    // Typical app-side migration points:
    // - CallOverride(...)
    // - annotations/uses in statements importing web3 types
    const inCall = node.ancestors().some((a) => a.kind() === "call");
    if (inCall) {
      return true;
    }

    const inStatement = node.ancestors().find((a) => a.kind().endsWith("_statement"));
    return Boolean(inStatement);
  };

  const isInsideControlFlow = (node: SgNode<Python>): SgNode<Python> | undefined =>
    node.ancestors().find((a) =>
      [
        "if_statement",
        "while_statement",
        "for_statement",
        "with_statement",
        "try_statement",
      ].includes(a.kind())
    );

  const replaceRemovedNamespaceUsageWithTodo = (
    node: SgNode<Python>,
    todoStarts: Set<number>,
    todoMessage: string,
    removedMessage: string
  ) => {
    const controlFlowStmt = isInsideControlFlow(node);
    if (controlFlowStmt) {
      const start = controlFlowStmt.range().start.index;
      if (!todoStarts.has(start)) {
        todoStarts.add(start);
        const indent = getLineIndentAt(start);
        addEdit(start, start, `# TODO(v7): ${todoMessage}\n${indent}`);
      }
      return;
    }

    const parentStmt = node.ancestors().find(
      (a) => a.kind() === "expression_statement" || a.kind() === "assignment"
    );
    if (parentStmt) {
      addEdit(
        parentStmt.range().start.index,
        parentStmt.range().end.index,
        `# REMOVED in v7: ${removedMessage}`
      );
    }
  };

  // --- Middleware function/class renames (strictly targeted) ---
  if (hasWeb3Context) {
    const middlewareIds = rootNode.findAll({
      rule: {
        kind: "identifier",
        any: [
          { pattern: "name_to_address_middleware" },
          { pattern: "geth_poa_middleware" },
        ],
      },
    });
    for (const node of middlewareIds) {
      const oldName = node.text();
      const newName = middlewareIdentifierMap[oldName];
      if (newName && shouldRenameMiddlewareIdentifier(node)) {
        addEdit(node.range().start.index, node.range().end.index, newName);
      }
    }
  }

  // --- CallOverride → StateOverride (strictly targeted) ---
  if (hasWeb3Context) {
    const callOverrideIds = rootNode.findAll({
      rule: {
        kind: "identifier",
        pattern: "CallOverride",
      },
    });
    for (const node of callOverrideIds) {
      if (shouldRenameCallOverrideIdentifier(node)) {
        addEdit(node.range().start.index, node.range().end.index, "StateOverride");
      }
    }
  }

  // --- String replacements for known identifiers (only in web3-import files) ---
  if (hasWeb3Context) {
    for (const repl of STRING_REPLACEMENTS) {
      const nodes = rootNode.findAll({
        rule: {
          kind: "identifier",
          pattern: repl.old,
        },
      });
      for (const node of nodes) {
        addEdit(node.range().start.index, node.range().end.index, repl.new);
      }
    }
  }

  // --- Remaining camelCase kwargs → snake_case kwargs ---
  if (hasWeb3Context) {
    const kwargRenames: Record<string, string> = {
      fromBlock: "from_block",
      toBlock: "to_block",
      blockHash: "block_hash",
    };
    for (const [oldKwarg, newKwarg] of Object.entries(kwargRenames)) {
      const kwargNodes = rootNode.findAll({
        rule: {
          kind: "identifier",
          pattern: oldKwarg,
        },
      });
      for (const node of kwargNodes) {
        const inKeywordArg = node.ancestors().some((a) => a.kind() === "keyword_argument");
        if (inKeywordArg) {
          addEdit(node.range().start.index, node.range().end.index, newKwarg);
        }
      }
    }
  }

  // --- encodeABI() → encode_abi() on attribute access ---
  const encodeAbiAttrs = rootNode.findAll({
    rule: {
      pattern: "$OBJ.encodeABI",
    },
  });
  for (const node of encodeAbiAttrs) {
    const text = node.text();
    const newText = text.replace(/\.encodeABI$/, ".encode_abi");
    if (newText !== text) {
      addEdit(node.range().start.index, node.range().end.index, newText);
    }
  }

  // --- .middlewares → .middleware (attribute access) ---
  if (hasWeb3Context) {
    const middlewareAttrs = rootNode.findAll({
      rule: {
        pattern: "$OBJ.middlewares",
      },
    });
    for (const node of middlewareAttrs) {
      const text = node.text();
      const newAttr = text.replace(/\.middlewares$/, ".middleware");
      if (newAttr !== text) {
        addEdit(node.range().start.index, node.range().end.index, newAttr);
      }
    }
  }

  // --- WebsocketProvider (without V2) → LegacyWebSocketProvider ---
  if (hasWeb3Context) {
    const wsNodes = rootNode.findAll({
      rule: {
        kind: "identifier",
        pattern: "WebsocketProvider",
      },
    });
    for (const node of wsNodes) {
      const text = node.text();
      if (text === "WebsocketProvider") {
        addEdit(
          node.range().start.index,
          node.range().end.index,
          "LegacyWebSocketProvider"
        );
      }
    }
  }

  // --- AsyncWeb3.persistent_websocket(...) → AsyncWeb3(...) ---
  if (hasWeb3Context) {
    const persistentWsCalls = rootNode.findAll({
      rule: {
        any: [
          { pattern: "AsyncWeb3.persistent_websocket($ARGS)" },
          { pattern: "$WEB3.persistent_websocket($ARGS)" },
        ],
      },
    });
    for (const node of persistentWsCalls) {
      const text = node.text();
      const replaced = text
        .replace(/\.persistent_websocket\(/, "(")
        .replace(/\bWebsocketProviderV2\b/g, "WebSocketProvider");
      if (replaced !== text) {
        addEdit(node.range().start.index, node.range().end.index, replaced);
      }
    }
  }

  // --- w3.ws.process_subscriptions() → w3.socket.process_subscriptions() ---
  if (hasWeb3Context) {
    const wsProcessNodes = rootNode.findAll({
      rule: {
        pattern: "$OBJ.ws.process_subscriptions",
      },
    });
    for (const node of wsProcessNodes) {
      const text = node.text();
      const replaced = text.replace(/\.ws\.process_subscriptions$/, ".socket.process_subscriptions");
      if (replaced !== text) {
        addEdit(node.range().start.index, node.range().end.index, replaced);
      }
    }
  }

  // --- construct_sign_and_send_raw_middleware → SignAndSendRawMiddlewareBuilder.build ---
  if (hasWeb3Context) {
    const signSendIds = rootNode.findAll({
      rule: {
        kind: "identifier",
        pattern: "construct_sign_and_send_raw_middleware",
      },
    });
    for (const node of signSendIds) {
      const inWeb3MiddlewareImport = node
        .ancestors()
        .find((a) => a.kind() === "import_from_statement")
        ?.text()
        .startsWith("from web3.middleware import");
      if (inWeb3MiddlewareImport) {
        addEdit(
          node.range().start.index,
          node.range().end.index,
          "SignAndSendRawMiddlewareBuilder"
        );
      }
    }

    const signSendCalls = rootNode.findAll({
      rule: {
        pattern: "construct_sign_and_send_raw_middleware($ARGS)",
      },
    });
    for (const node of signSendCalls) {
      const text = node.text();
      const replaced = text.replace(
        /^construct_sign_and_send_raw_middleware\(/,
        "SignAndSendRawMiddlewareBuilder.build("
      );
      if (replaced !== text) {
        addEdit(node.range().start.index, node.range().end.index, replaced);
      }
    }
  }

  // --- Removed middleware symbols → TODO/manual follow-up ---
  if (hasWeb3Context) {
    const removedMiddlewareSymbols = [
      "abi_middleware",
      "simple_cache_middleware",
      "latest_block_based_cache_middleware",
      "time_based_cache_middleware",
      "fixture_middleware",
      "result_generator_middleware",
      "http_retry_request_middleware",
      "normalize_request_parameters",
    ];
    for (const symbol of removedMiddlewareSymbols) {
      const nodes = rootNode.findAll({
        rule: {
          kind: "identifier",
          pattern: symbol,
        },
      });
      for (const node of nodes) {
        const parentStmt = node.ancestors().find(
          (a) => a.kind() === "import_statement" || a.kind() === "import_from_statement"
        );
        if (parentStmt) {
          addEdit(
            parentStmt.range().start.index,
            parentStmt.range().end.index,
            `# REMOVED in v7: ${symbol} removed; manual migration required`
          );
        }
      }
    }
  }

  // --- Statements containing geth.miner → replace statement with comment ---
  const minerNodes = rootNode.findAll({
    rule: {
      any: [
        { pattern: "$BASE.geth.miner" },
        { pattern: "$BASE.geth.miner.$METHOD" },
        { pattern: "$BASE.geth.miner.$METHOD($ARGS)" },
      ],
    },
  });
  for (const node of minerNodes) {
    replaceRemovedNamespaceUsageWithTodo(
      node,
      controlFlowMinerTodoStarts,
      "geth.miner removed; manual migration required",
      "geth.miner namespace removed"
    );
  }

  // --- Statements containing geth.personal → replace statement with comment ---
  const personalNodes = rootNode.findAll({
    rule: {
      any: [
        { pattern: "$BASE.geth.personal" },
        { pattern: "$BASE.geth.personal.$METHOD" },
        { pattern: "$BASE.geth.personal.$METHOD($ARGS)" },
      ],
    },
  });
  for (const node of personalNodes) {
    replaceRemovedNamespaceUsageWithTodo(
      node,
      controlFlowPersonalTodoStarts,
      "geth.personal removed; manual migration required",
      "geth.personal namespace removed"
    );
  }

  // --- EthPM/web3.pm/w3.pm statements → replace with comment ---
  const pmPatterns = ["web3.pm", "web3.ethpm", "w3.pm", "w3.ethpm", "EthPM($ARGS)"];
  for (const pat of pmPatterns) {
    const nodes = rootNode.findAll({
      rule: {
        pattern: pat,
      },
    });
    for (const node of nodes) {
      let target: SgNode<Python> | null = null;
      for (const anc of node.ancestors()) {
        const k = anc.kind();
        if (k.endsWith("_statement") || k === "assignment") {
          target = anc;
          break;
        }
      }
      if (target) {
        addEdit(
          target.range().start.index,
          target.range().end.index,
          "# REMOVED in v7: EthPM module removed"
        );
      }
    }
  }

  // --- Import lines with EthPM/LRU → replace with comment ---
  const importRemoveIds = ["EthPM", "LRU", "lru_dict"];
  for (const id of importRemoveIds) {
    const nodes = rootNode.findAll({
      rule: {
        kind: "identifier",
        pattern: id,
      },
    });
    for (const node of nodes) {
      // Check if this is inside an import statement
      const inImport = node.ancestors().some(
        (a) => a.kind() === "import_statement" || a.kind() === "import_from_statement"
      );
      if (inImport) {
        const parentStmt = node.ancestors().find(
          (a) => a.kind() === "import_statement" || a.kind() === "import_from_statement"
        );
        if (parentStmt) {
          addEdit(
            parentStmt.range().start.index,
            parentStmt.range().end.index,
            "# REMOVED in v7: this import no longer exists"
          );
        }
      }
    }
  }

  // --- Import lines from removed EthPM modules ---
  const removedModuleImports = rootNode.findAll({
    rule: {
      any: [
        { pattern: "from web3.pm import $NAMES" },
        { pattern: "from web3.ethpm import $NAMES" },
      ],
    },
  });
  for (const node of removedModuleImports) {
    addEdit(
      node.range().start.index,
      node.range().end.index,
      "# REMOVED in v7: this import no longer exists"
    );
  }

  if (!hasChanges) {
    return null;
  }

  return rootNode.commitEdits(edits);
};

export default codemod;
