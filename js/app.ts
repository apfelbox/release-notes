import {findFirst} from "@21torr/dune/dom/traverse";
import {on} from "@21torr/dune/dom/events";

const buttonGithub = findFirst<HTMLButtonElement>("#changelog-run-github");
const buttonGitlab = findFirst<HTMLButtonElement>("#changelog-run-gitlab");
const result = findFirst<HTMLDivElement>("#changelog-result");
const output = findFirst<HTMLDivElement>("#changelog-output");
const input = findFirst<HTMLTextAreaElement>("#changelog-input");

const CATEGORY_LABELS = {
	bc: ":boom: Breaking Changes",
	feature: ":gift: New Features",
	security: ":shield: Security",
	improvement: ":sparkles: Improvements",
	bug: ":bug: Bug Fixes",
	deprecation: ":wave: Deprecations",
	docs: ":memo: Documentation",
	internal: ":hammer_and_wrench: Internal",
};

type GroupedMessages = Record<keyof typeof CATEGORY_LABELS, string[]>;

if (buttonGithub && buttonGitlab && result && output && input)
{
	on(buttonGithub, "click", () => run(result, output, input, true));
	on(buttonGitlab, "click", () => run(result, output, input, false));
}

/**
 * Runs the conversion and updates the fields
 */
function run (result: HTMLDivElement, output: HTMLDivElement, input: HTMLTextAreaElement, isFullOutput: boolean) : void
{
	result.classList.remove("d-none");
	output.classList.remove("text-danger");

	try
	{
		const parsedCategories = parseInput(input.value);
		const result = transformToMarkdown(parsedCategories, isFullOutput);

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

	// the messages list and index of the last top-level entry, so that indented lines can be appended to it
	let previous: {messages: string[], index: number}|null = null;

	text
		.split("\n")
		.forEach(line =>
		{
			line = line.trimEnd();

			if ("" === line.trim())
			{
				return;
			}

			// indented lines (line breaks or nested list items) belong to the previous top-level entry
			if (/^\s/.test(line))
			{
				if (!previous)
				{
					throw new Error(`Found indented line without a top-level entry: "${line.trim()}"`);
				}

				previous.messages[previous.index] += `\n${line}`;
				return;
			}

			const matchResult = /^\*\s*\((?<category>.+?)\)(?<content>.+)$/.exec(line);

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
			previous = {messages: categories[category], index: categories[category].length - 1};
		});

	return categories;
}

/**
 * Transforms the grouped messages to rendered markdown
 */
function transformToMarkdown (groupedMessages: GroupedMessages, isFullOutput: boolean) : string|null
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

	if (isFullOutput)
	{
		result.push("---");
		result.push("");
		result.push("");
	}

	return result.join("\n");
}
