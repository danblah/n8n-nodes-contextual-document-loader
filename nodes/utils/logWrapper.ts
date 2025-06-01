import type { ISupplyDataFunctions, INodeExecutionData } from 'n8n-workflow';
import { Document } from '@langchain/core/documents';

interface Processor {
	processAll(items?: INodeExecutionData[]): Promise<Document[]>;
}

// Wrapper that provides the interface expected by n8n's vector stores
export function logWrapper(processor: Processor, context: ISupplyDataFunctions): any {
	// Return a function that will be called by the vector store
	return async () => {
		// Get the input data from the workflow
		const items = context.getInputData();
		
		// Process all items and return documents
		const documents = await processor.processAll(items);
		
		return documents;
	};
} 