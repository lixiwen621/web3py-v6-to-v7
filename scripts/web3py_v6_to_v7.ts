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
        // Also catch from web3.xxx import (even when xxx is not a sub-module pattern)
        { pattern: "from web3.types import $NAMES" },
        { pattern: "from web3.datastructures import $NAMES" },
        { pattern: "from web3.exceptions import $NAMES" },
        { pattern: "from web3.middleware import $NAMES" },
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
  // Only mappings confirmed by official v7 migration guide
  const middlewareIdentifierMap: Record<string, string> = {
    name_to_address_middleware: "ENSNameToAddressMiddleware",
    geth_poa_middleware: "ExtraDataToPOAMiddleware",
    pythonic_middleware: "PythonicMiddleware",
    attrdict_middleware: "AttributeDictMiddleware",
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

    // Check both .add() and .inject() — both are valid middleware registration methods
    const inMiddlewareOnionCall = node
      .ancestors()
      .find((a) => a.kind() === "call")
      ?.text()
      .match(/\.middleware_onion\.(add|inject)\(/);
    return Boolean(inMiddlewareOnionCall);
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
    const middlewarePatternList = Object.keys(middlewareIdentifierMap).map(
      (key) => ({ pattern: key })
    );
    const middlewareIds = rootNode.findAll({
      rule: {
        kind: "identifier",
        any: middlewarePatternList,
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

  // --- Exception type renames (only in web3.exceptions import contexts) ---
  // Official v7: AssertionError → Web3AssertionError, ValueError → Web3ValueError,
  // TypeError → Web3TypeError, AttributeError → Web3AttributeError,
  // SolidityError → ContractLogicError
  // For Python builtin exception names (AssertionError, ValueError, TypeError,
  // AttributeError), we ONLY rename in except/raise if the file explicitly imports
  // that name from web3.exceptions. Otherwise we'd break code that catches Python's
  // built-in ValueError/TypeError etc.
  if (hasWeb3Context) {
    const exceptionRenames: Record<string, string> = {
      AssertionError: "Web3AssertionError",
      ValueError: "Web3ValueError",
      TypeError: "Web3TypeError",
      AttributeError: "Web3AttributeError",
      SolidityError: "ContractLogicError",
    };
    // Python builtins that MUST NOT be renamed unless imported from web3.exceptions
    const builtinExceptionNames = new Set([
      "AssertionError", "ValueError", "TypeError", "AttributeError",
    ]);

    // Detect which web3 exceptions are imported from web3.exceptions
    const importedWeb3Exceptions = new Set<string>();
    const exImportNodes = rootNode.findAll({
      rule: { pattern: "from web3.exceptions import $NAMES" },
    });
    for (const node of exImportNodes) {
      const importText = node.text();
      for (const name of Object.keys(exceptionRenames)) {
        if (importText.includes(name)) {
          importedWeb3Exceptions.add(name);
        }
      }
    }

    for (const [oldEx, newEx] of Object.entries(exceptionRenames)) {
      const nodes = rootNode.findAll({
        rule: {
          kind: "identifier",
          pattern: oldEx,
        },
      });
      for (const node of nodes) {
        // Case 1: inside `from web3.exceptions import ...` — always rename
        const inWeb3ExceptionImport = node
          .ancestors()
          .find((a) => a.kind() === "import_from_statement")
          ?.text()
          .includes("from web3.exceptions import");
        if (inWeb3ExceptionImport) {
          // Avoid duplicate imports: if newEx already exists in the same import
          // line and it's NOT the same identifier being renamed, skip the rename
          const importText = node
            .ancestors()
            .find((a) => a.kind() === "import_from_statement")!
            .text();
          const afterImport = importText.slice(importText.indexOf("import") + "import".length);
          const existingNames = afterImport.split(",").map((n) => n.trim());
          if (existingNames.includes(newEx) && node.text() !== newEx) {
            // newEx already exists — skip renaming oldEx to avoid duplicate
            continue;
          }
          addEdit(node.range().start.index, node.range().end.index, newEx);
          continue;
        }

        // Case 2: inside `except <ExceptionType>` — only rename if imported from web3.exceptions
        const inExceptClause = node
          .ancestors()
          .some((a) => a.kind() === "except_clause");
        if (inExceptClause) {
          // Python builtins: only rename if imported from web3.exceptions
          const isBuiltin = builtinExceptionNames.has(oldEx);
          if (!isBuiltin || importedWeb3Exceptions.has(oldEx)) {
            addEdit(node.range().start.index, node.range().end.index, newEx);
          }
          continue;
        }

        // Case 3: inside `raise <ExceptionType>(...)` — same logic
        const inRaiseStmt = node.ancestors().find(
          (a) => a.kind() === "raise_statement" || a.kind() === "raise_stmt"
        );
        if (inRaiseStmt) {
          const isBuiltin = builtinExceptionNames.has(oldEx);
          if (!isBuiltin || importedWeb3Exceptions.has(oldEx)) {
            addEdit(node.range().start.index, node.range().end.index, newEx);
          }
          continue;
        }
      }
    }

    // Dedup web3.exceptions imports FIRST, before individual renames.
    // When a rename collides with an existing name (e.g. SolidityError →
    // ContractLogicError when ContractLogicError is already imported), we
    // rewrite the entire import line. Collect which import lines get deduped
    // so the individual rename pass below skips them, avoiding overlapping edits.
    const dedupedImportStarts = new Set<number>();
    for (const impNode of exImportNodes) {
      const importText = impNode.text();
      const importIdx = importText.indexOf("import");
      let namesStr = importText.slice(importIdx + "import".length).trim();
      // Strip parentheses for multiline imports: "( A, B, )" → "A, B,"
      namesStr = namesStr.replace(/^\(\s*/, "").replace(/\s*\)\s*$/, "");
      const rawNames = namesStr.split(",").map((n) => n.trim()).filter((n) => n.length > 0);
      const renamed: string[] = [];
      for (const name of rawNames) {
        renamed.push(exceptionRenames[name] || name);
      }
      const seen = new Set<string>();
      const unique: string[] = [];
      let hasDup = false;
      for (const name of renamed) {
        if (seen.has(name)) {
          hasDup = true;
          continue;
        }
        seen.add(name);
        unique.push(name);
      }
      if (hasDup) {
        dedupedImportStarts.add(impNode.range().start.index);
        // Preserve leading whitespace/indentation
        const indent = importText.match(/^(\s*)/)?.[1] ?? "";
        const newImport = `${indent}from web3.exceptions import ${unique.join(", ")}`;
        addEdit(
          impNode.range().start.index,
          impNode.range().end.index,
          newImport
        );
      }
    }

    // Individual rename pass — skip identifiers inside import lines that
    // are already handled by the dedup pass above.
    for (const [oldEx, newEx] of Object.entries(exceptionRenames)) {
      const nodes = rootNode.findAll({
        rule: {
          kind: "identifier",
          pattern: oldEx,
        },
      });
      for (const node of nodes) {
        const importAncestor = node
          .ancestors()
          .find((a) => a.kind() === "import_from_statement");
        const inWeb3ExceptionImport = importAncestor
          ?.text()
          .includes("from web3.exceptions import");

        // Skip if this import line was already handled by dedup
        if (inWeb3ExceptionImport && dedupedImportStarts.has(importAncestor.range().start.index)) {
          continue;
        }

        if (inWeb3ExceptionImport) {
          // Avoid duplicate imports: if newEx already exists in the same import
          // line and it's NOT the same identifier being renamed, skip the rename
          const importText = importAncestor.text();
          const afterImport = importText.slice(importText.indexOf("import") + "import".length);
          const existingNames = afterImport.split(",").map((n) => n.trim());
          if (existingNames.includes(newEx) && node.text() !== newEx) {
            continue;
          }
          addEdit(node.range().start.index, node.range().end.index, newEx);
          continue;
        }

        // Case 2: inside `except <ExceptionType>` — only rename if imported from web3.exceptions
        const inExceptClause = node
          .ancestors()
          .some((a) => a.kind() === "except_clause");
        if (inExceptClause) {
          const isBuiltin = builtinExceptionNames.has(oldEx);
          if (!isBuiltin || importedWeb3Exceptions.has(oldEx)) {
            addEdit(node.range().start.index, node.range().end.index, newEx);
          }
          continue;
        }

        // Case 3: inside `raise <ExceptionType>(...)` — same logic
        const inRaiseStmt = node.ancestors().find(
          (a) => a.kind() === "raise_statement" || a.kind() === "raise_stmt"
        );
        if (inRaiseStmt) {
          const isBuiltin = builtinExceptionNames.has(oldEx);
          if (!isBuiltin || importedWeb3Exceptions.has(oldEx)) {
            addEdit(node.range().start.index, node.range().end.index, newEx);
          }
          continue;
        }
      }
    }
  }

  // --- ABI type migration from web3.types → eth_typing ---
  // Official v7: ABI types moved to eth_typing v5 package
  // ABIEventParams → ABIComponentIndexed, ABIFunctionComponents → ABIComponent
  // ABIFunctionParams → ABIComponent, ABIElement → Union (handled via TODO)
  // ABIFunction → eth_typing, ABIEvent → eth_typing
  if (hasWeb3Context) {
    const abiTypeImports = rootNode.findAll({
      rule: {
        any: [
          { pattern: "from web3.types import $NAMES" },
          { pattern: "import web3.types" },
        ],
      },
    });
    const hasWeb3TypesImport = abiTypeImports.length > 0;

    if (hasWeb3TypesImport) {
      // Rename ABI type identifiers in type annotations and usage
      const abiTypeRenames: Record<string, string> = {
        ABIEventParams: "ABIComponentIndexed",
        ABIFunctionComponents: "ABIComponent",
        ABIFunctionParams: "ABIComponent",
      };
      for (const [oldType, newType] of Object.entries(abiTypeRenames)) {
        const typeNodes = rootNode.findAll({
          rule: {
            kind: "identifier",
            pattern: oldType,
          },
        });
        for (const node of typeNodes) {
          const inImport = node
            .ancestors()
            .some((a) => a.kind() === "import_from_statement");
          if (inImport) {
            addEdit(node.range().start.index, node.range().end.index, newType);
          }
          // Also rename in type annotations and general usage
          const inType = node
            .ancestors()
            .some((a) => a.kind() === "type" || a.kind() === "type_alias");
          if (inType) {
            addEdit(node.range().start.index, node.range().end.index, newType);
          }
          // Rename bare usage in statements (e.g. variable assignments with type hints)
          const inExpr = node
            .ancestors()
            .find((a) => a.kind() === "expression_statement");
          if (inExpr && !inImport && !inType) {
            addEdit(node.range().start.index, node.range().end.index, newType);
          }
        }
      }

      // Handle ABIElement → comment (it's a Union type, not a simple rename).
      // For import lines containing ABIElement, remove the identifier from the
      // import list and add a TODO comment above. Other identifiers on the same
      // line are preserved so valid imports aren't broken.
      const abiElementImports = rootNode.findAll({
        rule: { pattern: "from web3.types import $NAMES" },
      });
      for (const node of abiElementImports) {
        const text = node.text();
        if (text.includes("ABIElement")) {
          const indent = text.match(/^(\s*)/)?.[1] ?? "";
          const importIdx = text.indexOf("import");
          const namesStr = text.slice(importIdx + "import".length).trim();
          const rawNames = namesStr.split(",").map((n) => n.trim());
          const preserved = rawNames.filter((n) => n !== "ABIElement");
          if (preserved.length > 0) {
            addEdit(
              node.range().start.index,
              node.range().end.index,
              `${indent}# TODO(v7): ABIElement removed from eth_typing; use Union[ABIDict] instead\n${indent}from web3.types import ${preserved.join(", ")}`
            );
          } else {
            addEdit(
              node.range().start.index,
              node.range().end.index,
              `${indent}# REMOVED in v7: ABIElement removed from eth_typing; use Union[ABIDict] instead`
            );
          }
        }
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
  // Official v7: direct dictionary parameters retain camelCase; keyword
  // arguments to methods like `get_logs()` use snake_case.
  // `fn_abi` → `abi_callable` is also a keyword parameter rename.
  if (hasWeb3Context) {
    const kwargRenames: Record<string, string> = {
      fromBlock: "from_block",
      toBlock: "to_block",
      blockHash: "block_hash",
      fn_abi: "abi_callable",
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

  // --- encodeABI() → encode_abi() on attribute access (web3-specific) ---
  if (hasWeb3Context) {
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
  // Pattern is specific enough (.geth.miner only exists in web3.py code)
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
  // Pattern is specific enough (.geth.personal only exists in web3.py code)
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
  // LRU is scoped to web3.datastructures to avoid false positives on LRU from other packages
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
          const importText = parentStmt.text();
          // For LRU/lru_dict, only remove if from web3.datastructures
          if ((id === "LRU" || id === "lru_dict") &&
              importText.includes("web3.datastructures")) {
            addEdit(
              parentStmt.range().start.index,
              parentStmt.range().end.index,
              "# REMOVED in v7: this import no longer exists"
            );
          }
          // For EthPM, remove from any import (unlikely to be a common class name)
          if (id === "EthPM") {
            addEdit(
              parentStmt.range().start.index,
              parentStmt.range().end.index,
              "# REMOVED in v7: this import no longer exists"
            );
          }
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

  // --- function_identifier → abi_element_identifier (attribute access) ---
  if (hasWeb3Context) {
    const funcIdNodes = rootNode.findAll({
      rule: {
        pattern: "$OBJ.function_identifier",
      },
    });
    for (const node of funcIdNodes) {
      const text = node.text();
      const newText = text.replace(/\.function_identifier$/, ".abi_element_identifier");
      if (newText !== text) {
        addEdit(node.range().start.index, node.range().end.index, newText);
      }
    }
  }

  if (!hasChanges) {
    return null;
  }

  return rootNode.commitEdits(edits);
};

export default codemod;
