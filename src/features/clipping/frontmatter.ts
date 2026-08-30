import type { Property } from '../../types/types.js';
import { generateFrontmatter as generateFrontmatterCore } from '../../core/clipping/shared.js';
import { generalSettings } from '../../platform/browser/storage-utils.js';

export async function generateFrontmatter(properties: Property[]): Promise<string> {
	const typeMap: Record<string, string> = {};
	for (const propertyType of generalSettings.propertyTypes) {
		typeMap[propertyType.name] = propertyType.type;
	}
	return generateFrontmatterCore(properties, typeMap);
}
