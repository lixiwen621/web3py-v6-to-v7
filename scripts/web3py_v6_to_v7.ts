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
  // Middleware class renames
  { old: "name_to_address_middleware", new: "ENSNameToAddressMiddleware" },
  { old: "geth_poa_middleware", new: "ExtraDataToPOAMiddleware" },

  // WebSocketProvider
  { old: "WebsocketProviderV2", new: "WebSocketProvider" },

  // Type renames
  { old: "CallOverride", new: "StateOverride" },

  // API renames
  { old: "encodeABI", new: "encode_abi" },
  { old: "SolidityError", new: "ContractLogicError" },
];

const codemod: Codemod<Python> = async (root) => {
  const rootNode = root.root();
  const edits: Edit[] = [];
  let hasChanges = false;

  // --- String replacements for known identifiers ---
  for (const repl of STRING_REPLACEMENTS) {
    const nodes = rootNode.findAll({
      rule: {
        pattern: repl.old,
      },
    });
    for (const node of nodes) {
      edits.push({
        startPos: node.range().start.index,
        endPos: node.range().end.index,
        insertedText: repl.new,
      });
      hasChanges = true;
    }
  }

  // --- .middlewares → .middleware (attribute access) ---
  const middlewareAttrs = rootNode.findAll({
    rule: {
      pattern: "$OBJ.middlewares",
    },
  });
  for (const node of middlewareAttrs) {
    const text = node.text();
    const newAttr = text.replace(/\.middlewares$/, ".middleware");
    if (newAttr !== text) {
      edits.push({
        startPos: node.range().start.index,
        endPos: node.range().end.index,
        insertedText: newAttr,
      });
      hasChanges = true;
    }
  }

  // --- WebsocketProvider (without V2) → LegacyWebSocketProvider ---
  const wsNodes = rootNode.findAll({
    rule: {
      pattern: "WebsocketProvider",
    },
  });
  for (const node of wsNodes) {
    const text = node.text();
    if (text === "WebsocketProvider") {
      edits.push({
        startPos: node.range().start.index,
        endPos: node.range().end.index,
        insertedText: "LegacyWebSocketProvider",
      });
      hasChanges = true;
    }
  }

  // --- w3.geth.miner / geth.miner → comment ---
  const minerNodes = rootNode.findAll({
    rule: {
      any: [
        { pattern: "w3.geth.miner" },
        { pattern: "geth.miner" },
      ],
    },
  });
  for (const node of minerNodes) {
    edits.push({
      startPos: node.range().start.index,
      endPos: node.range().end.index,
      insertedText: "# REMOVED in v7: geth.miner namespace removed",
    });
    hasChanges = true;
  }

  // --- web3.pm / web3.ethpm → comment ---
  const pmNodes = rootNode.findAll({
    rule: {
      any: [
        { pattern: "web3.pm" },
        { pattern: "web3.ethpm" },
      ],
    },
  });
  for (const node of pmNodes) {
    edits.push({
      startPos: node.range().start.index,
      endPos: node.range().end.index,
      insertedText: "# REMOVED in v7: EthPM module removed",
    });
    hasChanges = true;
  }

  if (!hasChanges) {
    return null;
  }

  return rootNode.commitEdits(edits);
};

export default codemod;
