import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	NodeOperationError,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';

import { Document } from '@langchain/core/documents';
import { TextSplitter } from '@langchain/textsplitters';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { getConnectionHintNoticeField } from '../../utils/sharedFields';

export class ContextualDocumentLoader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Contextual Document Loader',
		name: 'contextualDocumentLoader',
		icon: 'file:contextualDocumentLoader.svg',
		group: ['transform'],
		version: 1,
		description: 'Load documents with contextual retrieval support for improved RAG performance',
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
						url: 'https://github.com/danblah/n8n-nodes-contextual-document-loader',
					},
				],
			},
		},
		inputs: [
			{
				displayName: 'Chat Model',
				maxConnections: 1,
				type: NodeConnectionType.AiLanguageModel,
				required: true,
			},
			{
				displayName: 'Text Splitter',
				maxConnections: 1,
				type: NodeConnectionType.AiTextSplitter,
				required: true,
			},
		],
		outputs: [NodeConnectionType.AiDocument],
		outputNames: ['Document'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiVectorStore]),
			{
				displayName: 'Context Prompt',
				name: 'contextPrompt',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				default: `Please give a short succinct context to situate this chunk within the whole document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else.`,
				description: 'Prompt template for generating contextual descriptions. The whole document and chunk will be automatically provided to the model.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Batch Size',
						name: 'batchSize',
						type: 'number',
						default: 10,
						description: 'Number of chunks to process in parallel when generating context',
					},
					{
						displayName: 'Context Prefix',
						name: 'contextPrefix',
						type: 'string',
						default: 'Context: ',
						description: 'Prefix to add before the contextual description',
					},
					{
						displayName: 'Context Separator',
						name: 'contextSeparator',
						type: 'string',
						default: '\n\n',
						description: 'Separator between context and chunk content',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						type: 'number',
						default: 3,
						description: 'Maximum number of retries for context generation',
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
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const processDocuments = async (documents: Document[]): Promise<Document[]> => {
			// Get the language model (required)
			const model = (await this.getInputConnectionData(
				NodeConnectionType.AiLanguageModel,
				0,
			)) as BaseLanguageModel;

			if (!model) {
				throw new NodeOperationError(
					this.getNode(),
					'No language model connected. Please connect a Chat Model to generate contextual descriptions.',
				);
			}

			// Get the text splitter (required)
			const textSplitter = (await this.getInputConnectionData(
				NodeConnectionType.AiTextSplitter,
				0,
			)) as TextSplitter | undefined;

			if (!textSplitter) {
				throw new NodeOperationError(
					this.getNode(),
					'No text splitter connected. Please connect a Text Splitter node.',
				);
			}

			// Get parameters
			const contextPrompt = this.getNodeParameter('contextPrompt', 0) as string;
			
			// Get options
			const options = this.getNodeParameter('options', 0, {}) as {
				contextPrefix?: string;
				contextSeparator?: string;
				metadata?: string;
				batchSize?: number;
				maxRetries?: number;
			};

			const contextPrefix = options.contextPrefix ?? 'Context: ';
			const contextSeparator = options.contextSeparator ?? '\n\n';
			const batchSize = options.batchSize ?? 10;
			const maxRetries = options.maxRetries ?? 3;

			// Parse additional metadata
			let additionalMetadata: Record<string, any> = {};
			if (options.metadata) {
				try {
					additionalMetadata = JSON.parse(options.metadata);
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						'Invalid JSON in metadata field',
					);
				}
			}

			const processedDocuments: Document[] = [];

			// Process each document
			for (const doc of documents) {
				const text = doc.pageContent;
				const docMetadata = { ...doc.metadata, ...additionalMetadata };

				// Split the document into chunks
				const chunks = await textSplitter.splitText(text);

				// Process chunks in batches with contextual retrieval
				for (let j = 0; j < chunks.length; j += batchSize) {
					const batch = chunks.slice(j, j + batchSize);
					const contextualChunks = await Promise.all(
						batch.map(async (chunk, batchIndex) => {
							const chunkIndex = j + batchIndex;
							let retries = 0;
							let context = '';

							while (retries < maxRetries) {
								try {
									// Create the full prompt with document and chunk
									const fullPrompt = `<document>
${text}
</document>

Here is the chunk we want to situate within the whole document:
<chunk>
${chunk}
</chunk>

${contextPrompt}`;

									const response = await model.invoke(fullPrompt);
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
									...docMetadata,
									chunkIndex,
									originalChunk: chunk,
									hasContext: !!context,
									context: context || undefined,
								},
							});
						}),
					);

					processedDocuments.push(...contextualChunks);
				}
			}

			return processedDocuments;
		};

		// Return a document processor function that vector stores can use
		return {
			response: processDocuments,
		};
	}

	// Keep the execute method for backward compatibility
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// This method is not used when the node is used as a sub-node
		// but we keep it for potential future use or testing
		throw new NodeOperationError(
			this.getNode(),
			'This node should be used as a sub-node connected to other AI nodes, not executed directly.',
		);
	}
}