import {on} from "mojave/dom/events";
import {findOne} from "mojave/dom/traverse";
import stringify from "remark-stringify";
import {Node} from 'unist';
import {VFile} from "vfile";
import unified, {Processor} from "unified";
import remarkStringify from "remark-stringify";
import parse from "remark-parse";

const button = findOne<HTMLButtonElement>("#changelog-run");
const buttonWithCommits = findOne<HTMLButtonElement>("#changelog-run-with-commits");
const result = findOne<HTMLDivElement>("#changelog-result");
const output = findOne<HTMLDivElement>("#changelog-output");
const input = findOne<HTMLTextAreaElement>("#changelog-input");

if (button && buttonWithCommits && result && output && input)
{
	on(button, "click", () => run(result, output, input, false));
	on(buttonWithCommits, "click", () => run(result, output, input, true));
}

/**
 * Runs the conversion and updates the fields
 *
 * @param result
 * @param output
 * @param input
 * @param includeCommits
 */
function run (result: HTMLDivElement, output: HTMLDivElement, input: HTMLTextAreaElement, includeCommits: boolean) : void
{
	result.classList.remove("d-none");
	output.classList.remove("text-danger");

	try
	{
		let result = transformMarkdown(input.value);

		if (includeCommits)
		{
			result += "\n\n\n## Commits\n\n";
		}

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



/**
 * Transforms the markdown
 *
 * @param input
 */
function transformMarkdown (input: string) : string
{
	let result = "";

	unified()
		.use(parse)
		.use(stringify, {
			bullet: "*"
		})
		.use(customProcessor)
		.freeze()
		.process(input, (err: Error|null, file: VFile) =>
		{
			if (err)
			{
				throw err;
			}

			result = String(file);
		});

	return result;
}


/**
 * A custom unified processor that renders lists a different way.
 *
 * @param this
 */
function customProcessor (this: Processor)
{
	let Compiler = this.Compiler;
	let visitors = Compiler.prototype.visitors;
	let original = visitors.list;

	visitors.list = function (node: Node, parent: Node)
	{
		let renderHeadline = (node: Node) => visitors.heading.apply(this, [node, parent]);
		let originalRenderer = (node: Node) => original.apply(this, [node, parent]);

		return (parent.type === "root")
			? transformList(node, originalRenderer, renderHeadline)
			: originalRenderer(node);
	};
}


/**
 * Transforms a top-level list.
 *
 * @param node
 * @param listRenderer
 * @param headlineRenderer
 */
function transformList (node: Node, listRenderer: remarkStringify.Visitor, headlineRenderer: remarkStringify.Visitor) : string
{
	let categories: {[key: string]: Node[]} = {
		bc: [],
		feature: [],
		improvement: [],
		bug: [],
		deprecation: [],
		docs: [],
		internal: [],
	};

	(node.children as Node[]).forEach(
		child => transformListItem(child, categories)
	);

	let sections = [
		renderList(categories.bc, ":boom: Breaking Changes", listRenderer, headlineRenderer),
		renderList(categories.feature, ":gift: New Features", listRenderer, headlineRenderer),
		renderList(categories.improvement, ":sparkles: Improvements", listRenderer, headlineRenderer),
		renderList(categories.bug, ":bug: Bug Fixes", listRenderer, headlineRenderer),
		renderList(categories.deprecation, ":wave: Deprecations", listRenderer, headlineRenderer),
		renderList(categories.docs, ":memo: Documentation", listRenderer, headlineRenderer),
		renderList(categories.internal, ":hammer_and_wrench: Internal", listRenderer, headlineRenderer),
	];

	return sections
		.filter(entry => entry.length)
		.join("\n\n\n");
}


/**
 * Transforms a list item
 *
 * @param listItem
 */
function transformListItem (listItem: Node, categories: {[key: string]: Node[]}) : void
{
	let paragraph = (listItem.children as Node[])[0];

	if (!paragraph || paragraph.type !== "paragraph")
	{
		throw new Error("Can't transform list item without paragraph as first child");
	}

	let text = (paragraph.children as Node[])[0];

	if (!text || text.type !== "text")
	{
		throw new Error("Can't transform list item without text");
	}

	let value = text.value as string;

	let match = /^\((?<type>\w+)\)\s*(?<rest>.*?)$/s.exec(value);

	if (!match)
	{
		throw new Error(`Can't match type in text '${value}'`);
	}

	let type = (match.groups as any).type;

	if (!categories[type])
	{
		throw new Error(`Unknown type '${type}'`);
	}

	text.value = (match.groups as any).rest;
	categories[type].push(listItem);
}


/**
 * Renders a single list with the given headline
 *
 * @param nodes
 * @param headline
 * @param listRenderer
 * @param headlineRenderer
 */
function renderList (nodes: Node[], headline: string, listRenderer: remarkStringify.Visitor, headlineRenderer: remarkStringify.Visitor) : string
{
	if (!nodes.length)
	{
		return "";
	}

	return [
		headlineRenderer({
			type: "heading",
			depth: 2,
			children: [{ type: "text", value: headline}],
		}),
		listRenderer({
			type: "list",
			ordered: false,
			start: null,
			spread: false,
			children: nodes,
		}),
	].join("\n\n");
}
