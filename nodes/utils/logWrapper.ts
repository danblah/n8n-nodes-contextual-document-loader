import type { ISupplyDataFunctions } from 'n8n-workflow';

// Simple logWrapper that returns the processor as-is
// In the full n8n implementation, this would add logging and error handling
export function logWrapper<T>(processor: T, context: ISupplyDataFunctions): T {
	return processor;
} 