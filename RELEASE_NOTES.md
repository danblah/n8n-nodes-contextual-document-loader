# Release Notes

## v0.2.2 - Fix Data Flow

### Bug Fixes

- Fixed "no output" issue by removing main input requirement
- The node now properly receives data from the parent vector store node
- Adjusted parameter indexing to work correctly as a sub-node

### How It Works

The Contextual Document Loader is a sub-node that:
1. Receives data from the vector store's main input
2. Processes it with contextual retrieval
3. Passes the enhanced documents to the vector store

No direct main input connection is needed to the Contextual Document Loader.

## v0.2.1 - Bug Fix

### Bug Fixes

- Fixed "Node does not have a `supplyData` method defined" error
- The node now properly implements the `supplyData` method required for LangChain sub-nodes
- Changed from `execute` to `supplyData` for proper integration with vector stores and other AI nodes

## v0.2.0 - Major Refactor

### Breaking Changes

- Node now requires a Text Splitter input connection instead of defining text splitters internally
- Removed 'Enable Contextual Retrieval' option - the node is now specifically for contextual retrieval
- Chat Model input is now required

### New Features

- Uses any n8n text splitter node via input connection
- Simplified prompt handling - automatically provides document and chunk to LLM
- Context prompt is now a main parameter (not hidden in options)
- Cleaner, more focused implementation

### Migration Guide

If upgrading from v0.1.0:
1. Add a Text Splitter node (e.g., Recursive Character Text Splitter) to your workflow
2. Connect it to the Contextual Document Loader's Text Splitter input
3. Remove any text splitter configuration from the node itself
4. The context prompt no longer needs {{WHOLE_DOCUMENT}} and {{CHUNK_CONTENT}} placeholders

## v0.1.0 - Initial Release

- Initial implementation of Contextual Document Loader
- Support for contextual retrieval using Anthropic's technique
- Built-in text splitters
- Configurable context generation 