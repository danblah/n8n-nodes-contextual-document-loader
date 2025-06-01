# n8n-nodes-contextual-document-loader

This is an n8n community node that provides document loading with **Contextual Retrieval** support, implementing the technique described in [Anthropic's blog post](https://www.anthropic.com/news/contextual-retrieval). This node dramatically improves RAG (Retrieval-Augmented Generation) performance by adding context to document chunks before they are embedded.

## What is Contextual Retrieval?

Traditional RAG systems often fail because they split documents into chunks that lack sufficient context. For example, a chunk might say "The company's revenue grew by 3%" without specifying which company or time period.

Contextual Retrieval solves this by using an LLM to generate chunk-specific context that explains each chunk within the broader document. This context is prepended to the chunk before embedding, significantly improving retrieval accuracy.

According to Anthropic's research, this technique can:
- Reduce retrieval failure rates by 35% with contextual embeddings alone
- Reduce retrieval failure rates by 49% when combined with BM25
- Reduce retrieval failure rates by 67% when combined with reranking

## Features

- **Contextual chunk enhancement** using any connected LLM
- **Multiple text splitting strategies**:
  - Character-based splitting
  - Token-based splitting
  - Recursive character splitting
  - Markdown-aware splitting
- **Customizable context generation prompt**
- **Batch processing** for efficient context generation
- **Automatic retry logic** for reliability
- **Flexible metadata support**
- **Works seamlessly with vector stores** and other n8n AI nodes

## Installation

### Community Node (Recommended)

1. In n8n, go to **Settings** > **Community Nodes**
2. Search for `n8n-nodes-contextual-document-loader`
3. Click **Install**

### Manual Installation

```bash
npm install n8n-nodes-contextual-document-loader
```

## Usage

### Basic Setup

1. Add the **Contextual Document Loader** node to your workflow
2. Connect a **Chat Model** node (e.g., OpenAI, Anthropic Claude, etc.) to the model input
3. Connect your data source to the main input
4. Connect the output to a **Vector Store** node

### Example Workflow

```
[Data Source] → [Contextual Document Loader] → [Vector Store]
                            ↑
                     [Chat Model]
```

### Configuration Options

#### Main Settings

- **Text Splitter**: Choose how to split your documents
  - Recursive Character Text Splitter (recommended)
  - By Character Count
  - By Token Count
  - Markdown

- **Chunk Size**: Maximum size of each chunk (default: 1000)
- **Chunk Overlap**: Number of characters to overlap between chunks (default: 200)

#### Contextual Retrieval Options

- **Enable Contextual Retrieval**: Toggle context generation (default: true)
- **Context Prompt**: Customize the prompt used to generate context
- **Context Prefix**: Text to add before context (default: "Context: ")
- **Context Separator**: Separator between context and chunk (default: "\n\n")
- **Batch Size**: Number of chunks to process in parallel (default: 10)
- **Max Retries**: Maximum retry attempts for context generation (default: 3)

### Input Data Format

The node accepts various input formats:

```json
{
  "text": "Your document content here",
  "source": "optional-source-identifier",
  "fileName": "optional-filename.txt"
}
```

Or:
```json
{
  "content": "Your document content here"
}
```

Or:
```json
{
  "document": "Your document content here"
}
```

### Output Format

The node outputs documents in the standard n8n AI document format:

```json
{
  "documents": [
    {
      "pageContent": "Context: This chunk discusses Q2 2023 revenue for ACME Corp...\n\nThe company's revenue grew by 3%...",
      "metadata": {
        "chunkIndex": 0,
        "originalChunk": "The company's revenue grew by 3%...",
        "hasContext": true,
        "context": "This chunk discusses Q2 2023 revenue for ACME Corp...",
        "source": "acme-q2-2023.pdf"
      }
    }
  ],
  "documentCount": 42
}
```

## Customizing the Context Prompt

The default prompt is based on Anthropic's recommended approach:

```
<document>
{{WHOLE_DOCUMENT}}
</document>

Here is the chunk we want to situate within the whole document:
<chunk>
{{CHUNK_CONTENT}}
</chunk>

Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else.
```

You can customize this prompt for your specific use case. The placeholders `{{WHOLE_DOCUMENT}}` and `{{CHUNK_CONTENT}}` will be replaced with actual content.

### Domain-Specific Examples

**For Technical Documentation:**
```
Document: {{WHOLE_DOCUMENT}}

Chunk: {{CHUNK_CONTENT}}

Provide a brief technical context explaining what system, component, or feature this chunk relates to. Include any relevant version numbers, dependencies, or technical terms that would help retrieve this information.
```

**For Legal Documents:**
```
Full document: {{WHOLE_DOCUMENT}}

Excerpt: {{CHUNK_CONTENT}}

Provide a concise legal context identifying the parties involved, the type of agreement or clause, and the section of the document this excerpt belongs to.
```

## Use Cases

- **Knowledge Base Search**: Improve accuracy when searching through documentation
- **Customer Support**: Better retrieve relevant support articles and FAQs
- **Legal Document Analysis**: Find specific clauses and provisions more accurately
- **Research Papers**: Improve citation and reference retrieval
- **Code Documentation**: Better search through API docs and code comments

## Performance Considerations

1. **LLM Costs**: Generating context for each chunk requires LLM API calls. Consider:
   - Using a cost-effective model for context generation
   - Adjusting batch size based on rate limits
   - Caching results for frequently processed documents

2. **Processing Time**: Context generation adds processing time. To optimize:
   - Increase batch size for parallel processing
   - Use a faster LLM for context generation
   - Consider disabling for small documents that fit in a single chunk

3. **Chunk Size**: Larger chunks provide more context but may dilute search relevance. Experiment with different sizes for your use case.

## Comparison with Standard Document Loader

| Feature | Standard Loader | Contextual Loader |
|---------|----------------|-------------------|
| Basic text splitting | ✅ | ✅ |
| Multiple splitter types | ✅ | ✅ |
| Metadata support | ✅ | ✅ |
| Context generation | ❌ | ✅ |
| LLM integration | ❌ | ✅ |
| Improved retrieval accuracy | ❌ | ✅ |
| Customizable prompts | ❌ | ✅ |

## Troubleshooting

### "No language model connected" Error
- Ensure you've connected a Chat Model node to the model input
- Check that your LLM credentials are properly configured

### Context Generation Failures
- Check your LLM API limits and quotas
- Reduce batch size if hitting rate limits
- Increase max retries for unreliable connections
- Check the console for specific error messages

### High Costs
- Use a more cost-effective model for context generation
- Increase chunk size to reduce the number of chunks
- Consider disabling contextual retrieval for less critical documents

### Slow Processing
- Increase batch size for parallel processing
- Use a faster LLM model
- Consider processing documents asynchronously

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Credits

This node implements the Contextual Retrieval technique described by [Anthropic](https://www.anthropic.com/news/contextual-retrieval).

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/danblah/n8n-nodes-contextual-document-loader/issues). 