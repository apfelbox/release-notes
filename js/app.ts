import {findFirst} from "@21torr/dune/dom/traverse";
import {on} from "@21torr/dune/dom/events";

const button = findFirst<HTMLButtonElement>("#changelog-run");
const result = findFirst<HTMLDivElement>("#changelog-result");
const output = findFirst<HTMLDivElement>("#changelog-output");
const input = findFirst<HTMLTextAreaElement>("#changelog-input");

const CATEGORY_LABELS = {
	bc: ":boom: Breaking Changes",
	feature: ":gift: New Features",
	improvement: ":sparkles: Improvements",
	bug: ":bug: Bug Fixes",
	deprecation: ":wave: Deprecations",
	docs: ":memo: Documentation",
	internal: ":hammer_and_wrench: Internal",
};

type GroupedMessages = Record<keyof typeof CATEGORY_LABELS, string[]>;

if (button && result && output && input)
{
	on(button, "click", () => run(result, output, input));
}

/**
 * Runs the conversion and updates the fields
 */
function run (result: HTMLDivElement, output: HTMLDivElement, input: HTMLTextAreaElement) : void
{
	result.classList.remove("d-none");
	output.classList.remove("text-danger");

	try
	{
		const parsedCategories = parseInput(input.value);
		const result = transformToMarkdown(parsedCategories);

		output.textContent = result;

		if (navigator.clipboard)
		{
			navigator.clipboard.writeText(result);
		}
	}
	catch (e)
	{
		output.textContent = e.message;
		output.classList.add("text-danger");
	}
}


function parseInput (text: string) : GroupedMessages
{
	const categories: GroupedMessages = Object.fromEntries(
		Object.keys(CATEGORY_LABELS)
			.map(label => ([label, []]))
	) as GroupedMessages;

	text
		.split("\n")
		.forEach(line =>
		{
			line = line.trim();

			if ("" === line)
			{
				return;
			}

			const matchResult = /^\s*\*\s*\((?<category>.+?)\)(?<content>.+)$/.exec(line);

			if (!matchResult)
			{
				throw new Error(`Could not parse line "${line}"`);
			}

			const category = matchResult.groups.category;
			const content = matchResult.groups.content;

			if (!categories[category])
			{
				throw new Error(`Found invalid category: "${category}"`);
			}

			categories[category].push(content);
		});

	return categories;
}

/**
 * Transforms the grouped messages to rendered markdown
 */
function transformToMarkdown (groupedMessages: GroupedMessages) : string|null
{
	const result = [];

	for (const key in groupedMessages)
	{
		const messages = groupedMessages[key];

		if (!messages.length)
		{
			continue;
		}

		if (result.length > 0)
		{
			result.push("");
			result.push("");
		}

		result.push(`## ${CATEGORY_LABELS[key]}`);
		result.push("");

		messages.forEach(line => result.push(`* ${line}`));
	}

	if (!result.length)
	{
		return null;
	}

	result.push("");
	result.push("");
	result.push("---");
	result.push("");
	result.push("");

	return result.join("\n");
}
