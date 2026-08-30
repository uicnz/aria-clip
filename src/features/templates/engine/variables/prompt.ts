// This function doesn't really do anything, it just returns the whole prompt variable
// so that it's still visible in the input fields in the popup
export async function processPrompt(match: string, preserveInterpreterVariables: boolean): Promise<string> {
	if (preserveInterpreterVariables) {
		const promptRegex = /{{(?:prompt:)?"([\s\S]*?)"(\|[\s\S]*?)?}}/;
		const matches = match.match(promptRegex);
		if (!matches) {
			console.error('Invalid prompt format:', match);
			return match;
		}
	
		const [, promptText, filters = ''] = matches;
		void promptText;
		void filters;
	
		return match;
	} else {
		return '';
	}
}
