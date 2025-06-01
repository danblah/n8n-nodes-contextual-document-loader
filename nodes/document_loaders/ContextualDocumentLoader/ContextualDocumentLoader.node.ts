import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

import { Document } from '@langchain/core/documents';
import { TextSplitter } from '@langchain/textsplitters';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { TokenTextSplitter } from '@langchain/textsplitters';
import { CharacterTextSplitter } from '@langchain/textsplitters';
import { MarkdownTextSplitter } from '@langchain/textsplitters';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { getConnectionHintNoticeField } from '../../utils/sharedFields';

export class ContextualDocumentLoader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Contextual Document Loader',
		name: 'contextualDocumentLoader',
		icon: 'file:contextualDocumentLoader.svg',
		group: ['transform'],
		version: 1,
		description: 'Load documents with contextual retrieval support',
		defaults: {
			name: 'Contextual Document Loader',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Document Loaders'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.documentdefaultdataloader/',
					},
				],
			},
		},
		inputs: [
			NodeConnectionType.Main,
			{
				displayName: 'Chat Model',
				maxConnections: 1,
				type: NodeConnectionType.AiLanguageModel,
				required: false,
			},
		],
		outputs: [NodeConnectionType.AiDocument],
		outputNames: ['Document'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiVectorStore]),
			{
				displayName: 'Text Splitter',
				name: 'textSplitter',
				type: 'options',
				options: [
					{
						name: 'By Character Count',
						value: 'characterTextSplitter',
						description: 'Split text based on character count',
					},
					{
						name: 'By Token Count',
						value: 'tokenTextSplitter',
						description: 'Split text based on token count',
					},
					{
						name: 'Recursive Character Text Splitter',
						value: 'recursiveCharacterTextSplitter',
						description: 'Split text recursively with preferred separators',
					},
					{
						name: 'Markdown',
						value: 'markdownTextSplitter',
						description: 'Split text based on Markdown formatting',
					},
				],
				default: 'recursiveCharacterTextSplitter',
			},
			{
				displayName: 'Chunk Size',
				name: 'chunkSize',
				type: 'number',
				default: 1000,
				description: 'The maximum size of each chunk in characters',
			},
			{
				displayName: 'Chunk Overlap',
				name: 'chunkOverlap',
				type: 'number',
				default: 200,
				description: 'The number of characters to overlap between chunks',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Enable Contextual Retrieval',
						name: 'enableContextualRetrieval',
						type: 'boolean',
						default: true,
						description: 'Whether to add contextual descriptions to chunks',
					},
					{
						displayName: 'Context Prompt',
						name: 'contextPrompt',
						type: 'string',
						typeOptions: {
							rows: 10,
						},
						default: `<document>
{{WHOLE_DOCUMENT}}
</document>

Here is the chunk we want to situate within the whole document:
<chunk>
{{CHUNK_CONTENT}}
</chunk>

Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else.`,
						description: 'Prompt template for generating contextual descriptions. Use {{WHOLE_DOCUMENT}} and {{CHUNK_CONTENT}} as placeholders.',
						displayOptions: {
							show: {
								enableContextualRetrieval: [true],
							},
						},
					},
					{
						displayName: 'Context Prefix',
						name: 'contextPrefix',
						type: 'string',
						default: 'Context: ',
						description: 'Prefix to add before the contextual description',
						displayOptions: {
							show: {
								enableContextualRetrieval: [true],
							},
						},
					},
					{
						displayName: 'Context Separator',
						name: 'contextSeparator',
						type: 'string',
						default: '\n\n',
						description: 'Separator between context and chunk content',
						displayOptions: {
							show: {
								enableContextualRetrieval: [true],
							},
						},
					},
					{
						displayName: 'Metadata',
						name: 'metadata',
						type: 'json',
						default: '{}',
						description: 'Additional metadata to add to all documents',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
					},
					{
						displayName: 'Separators',
						name: 'separators',
						type: 'string',
						default: '["\n\n", "\n", " ", ""]',
						description: 'Separators to use when splitting text recursively',
						displayOptions: {
							show: {
								'/textSplitter': ['recursiveCharacterTextSplitter'],
							},
						},
					},
					{
						displayName: 'Keep Separator',
						name: 'keepSeparator',
						type: 'boolean',
						default: false,
						description: 'Whether to keep the separator in the chunks',
						displayOptions: {
							show: {
								'/textSplitter': ['recursiveCharacterTextSplitter'],
							},
						},
					},
					{
						displayName: 'Encoding Model',
						name: 'encodingModel',
						type: 'options',
						options: [
							{ name: 'GPT-2', value: 'gpt2' },
							{ name: 'GPT-3', value: 'r50k_base' },
							{ name: 'GPT-3.5/GPT-4', value: 'cl100k_base' },
						],
						default: 'cl100k_base',
						description: 'The encoding model to use for token counting',
						displayOptions: {
							show: {
								'/textSplitter': ['tokenTextSplitter'],
							},
						},
					},
					{
						displayName: 'Batch Size',
						name: 'batchSize',
						type: 'number',
						default: 10,
						description: 'Number of chunks to process in parallel when generating context',
						displayOptions: {
							show: {
								enableContextualRetrieval: [true],
							},
						},
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						type: 'number',
						default: 3,
						description: 'Maximum number of retries for context generation',
						displayOptions: {
							show: {
								enableContextualRetrieval: [true],
							},
						},
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const documents: Document[] = [];

		// Get the language model if connected
		const model = (await this.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			0,
		)) as BaseLanguageModel | undefined;

		// Get options
		const options = this.getNodeParameter('options', 0, {}) as {
			enableContextualRetrieval?: boolean;
			contextPrompt?: string;
			contextPrefix?: string;
			contextSeparator?: string;
			metadata?: string;
			separators?: string;
			keepSeparator?: boolean;
			encodingModel?: string;
			batchSize?: number;
			maxRetries?: number;
		};

		const enableContextualRetrieval = options.enableContextualRetrieval ?? true;
		const contextPrompt = options.contextPrompt ?? `<document>
{{WHOLE_DOCUMENT}}
</document>

Here is the chunk we want to situate within the whole document:
<chunk>
{{CHUNK_CONTENT}}
</chunk>

Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else.`;
		const contextPrefix = options.contextPrefix ?? 'Context: ';
		const contextSeparator = options.contextSeparator ?? '\n\n';
		const batchSize = options.batchSize ?? 10;
		const maxRetries = options.maxRetries ?? 3;

		// Check if contextual retrieval is enabled but no model is connected
		if (enableContextualRetrieval && !model) {
			throw new NodeOperationError(
				this.getNode(),
				'Contextual retrieval is enabled but no language model is connected. Please connect a Chat Model or disable contextual retrieval.',
			);
		}

		// Get text splitter configuration
		const textSplitterType = this.getNodeParameter('textSplitter', 0) as string;
		const chunkSize = this.getNodeParameter('chunkSize', 0) as number;
		const chunkOverlap = this.getNodeParameter('chunkOverlap', 0) as number;

		// Create the appropriate text splitter
		let textSplitter: TextSplitter;

		switch (textSplitterType) {
			case 'characterTextSplitter':
				textSplitter = new CharacterTextSplitter({
					chunkSize,
					chunkOverlap,
					separator: '\n',
				});
				break;

			case 'tokenTextSplitter':
				const encodingModel = options.encodingModel || 'cl100k_base';
				textSplitter = new TokenTextSplitter({
					chunkSize,
					chunkOverlap,
					encodingName: encodingModel as any,
				});
				break;

			case 'markdownTextSplitter':
				textSplitter = new MarkdownTextSplitter({
					chunkSize,
					chunkOverlap,
				});
				break;

			case 'recursiveCharacterTextSplitter':
			default:
				const separators = options.separators
					? JSON.parse(options.separators)
					: ['\n\n', '\n', ' ', ''];
				const keepSeparator = options.keepSeparator ?? false;

				textSplitter = new RecursiveCharacterTextSplitter({
					chunkSize,
					chunkOverlap,
					separators,
					keepSeparator,
				});
				break;
		}

		// Parse metadata
		let metadata: Record<string, any> = {};
		if (options.metadata) {
			try {
				metadata = JSON.parse(options.metadata);
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					'Invalid JSON in metadata field',
				);
			}
		}

		// Process each input item
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const item = items[itemIndex];

			// Get text content from the item
			let text = '';
			let itemMetadata = { ...metadata };

			if (item.json.text) {
				text = item.json.text as string;
			} else if (item.json.content) {
				text = item.json.content as string;
			} else if (item.json.document) {
				text = item.json.document as string;
			} else if (item.json.data) {
				text = item.json.data as string;
			} else {
				// Try to convert the entire JSON to string
				text = JSON.stringify(item.json);
			}

			// Add source metadata if available
			if (item.json.source) {
				itemMetadata.source = item.json.source;
			}
			if (item.json.fileName) {
				itemMetadata.fileName = item.json.fileName;
			}
			if (item.json.fileType) {
				itemMetadata.fileType = item.json.fileType;
			}

			// Split the text into chunks
			const chunks = await textSplitter.splitText(text);

			// Process chunks with contextual retrieval if enabled
			if (enableContextualRetrieval && model) {
				// Process chunks in batches
				for (let i = 0; i < chunks.length; i += batchSize) {
					const batch = chunks.slice(i, i + batchSize);
					const contextualChunks = await Promise.all(
						batch.map(async (chunk, batchIndex) => {
							const chunkIndex = i + batchIndex;
							let retries = 0;
							let context = '';

							while (retries < maxRetries) {
								try {
									// Generate context for the chunk
									const prompt = contextPrompt
										.replace('{{WHOLE_DOCUMENT}}', text)
										.replace('{{CHUNK_CONTENT}}', chunk);

									const response = await model.invoke(prompt);
									context = typeof response === 'string' 
										? response 
										: response.content?.toString() || '';
									
									break;
								} catch (error) {
									retries++;
									if (retries >= maxRetries) {
										console.error(`Failed to generate context for chunk ${chunkIndex}:`, error);
										// Fall back to chunk without context
										context = '';
									} else {
										// Wait before retrying
										await new Promise(resolve => setTimeout(resolve, 1000 * retries));
									}
								}
							}

							// Combine context with chunk content
							const contextualContent = context
								? `${contextPrefix}${context}${contextSeparator}${chunk}`
								: chunk;

							return new Document({
								pageContent: contextualContent,
								metadata: {
									...itemMetadata,
									chunkIndex,
									originalChunk: chunk,
									hasContext: !!context,
									context: context || undefined,
								},
							});
						}),
					);

					documents.push(...contextualChunks);
				}
			} else {
				// No contextual retrieval - create documents normally
				chunks.forEach((chunk, chunkIndex) => {
					documents.push(
						new Document({
							pageContent: chunk,
							metadata: {
								...itemMetadata,
								chunkIndex,
							},
						}),
					);
				});
			}
		}

		return [
			[
				{
					json: {
						documents,
						documentCount: documents.length,
					},
				},
			],
		];
	}
}