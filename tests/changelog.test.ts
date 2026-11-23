import {describe, expect, it} from "vitest";
import {CATEGORY_LABELS, parseInput, transformToMarkdown} from "../js/changelog";

function render (input: string, isFullOutput = false) : string|null
{
	return transformToMarkdown(parseInput(input), isFullOutput);
}

describe("parseInput", () =>
{
	it("returns an empty list for every category on empty input", () =>
	{
		const result = parseInput("");

		expect(Object.keys(result)).toEqual(Object.keys(CATEGORY_LABELS));
		Object.values(result).forEach(messages => expect(messages).toEqual([]));
	});

	it.each(Object.keys(CATEGORY_LABELS))("accepts the %s category", category =>
	{
		const result = parseInput(`* (${category}) Some change`);

		expect(result[category]).toEqual([" Some change"]);
	});

	it("groups multiple entries by category, keeping their order", () =>
	{
		const result = parseInput([
			"* (bug) First bug",
			"* (feature) A feature",
			"* (bug) Second bug",
		].join("\n"));

		expect(result.bug).toEqual([" First bug", " Second bug"]);
		expect(result.feature).toEqual([" A feature"]);
	});

	it("allows no space between the bullet and the category", () =>
	{
		expect(parseInput("*(bug) Fix").bug).toEqual([" Fix"]);
	});

	it("ignores blank and whitespace-only lines", () =>
	{
		const result = parseInput("\n* (bug) Fix\n   \n\n* (docs) Docs\n");

		expect(result.bug).toEqual([" Fix"]);
		expect(result.docs).toEqual([" Docs"]);
	});

	it("strips trailing whitespace", () =>
	{
		expect(parseInput("* (bug) Fix   \t").bug).toEqual([" Fix"]);
	});

	it("handles Windows line endings", () =>
	{
		expect(parseInput("* (bug) Fix\r\n* (docs) Docs\r\n").bug).toEqual([" Fix"]);
	});

	it("appends indented lines to the previous entry", () =>
	{
		const result = parseInput([
			"* (feature) Add an overview page.",
			"  It requires a migration.",
			"* (bug) Fix thing",
		].join("\n"));

		expect(result.feature).toEqual([" Add an overview page.\n  It requires a migration."]);
		expect(result.bug).toEqual([" Fix thing"]);
	});

	it("appends nested list items to the previous entry", () =>
	{
		const result = parseInput([
			"* (bug) Fix thing",
			"  * first detail",
			"    * deeper detail",
			"  * second detail",
		].join("\n"));

		expect(result.bug).toEqual([" Fix thing\n  * first detail\n    * deeper detail\n  * second detail"]);
	});

	it("appends tab-indented lines to the previous entry", () =>
	{
		expect(parseInput("* (bug) Fix\n\tmore").bug).toEqual([" Fix\n\tmore"]);
	});

	it("appends indented lines after a blank line to the previous entry", () =>
	{
		expect(parseInput("* (bug) Fix\n\n  more").bug).toEqual([" Fix\n  more"]);
	});

	it("appends indented lines to the correct entry when categories alternate", () =>
	{
		const result = parseInput([
			"* (bug) First bug",
			"* (feature) Feature",
			"* (bug) Second bug",
			"  second bug detail",
		].join("\n"));

		expect(result.bug).toEqual([" First bug", " Second bug\n  second bug detail"]);
		expect(result.feature).toEqual([" Feature"]);
	});

	it("fails on an indented line without a previous entry", () =>
	{
		expect(() => parseInput("  orphan line"))
			.toThrow(`Found indented line without a top-level entry: "orphan line"`);
	});

	it("fails on an unknown category", () =>
	{
		expect(() => parseInput("* (unknown) Something"))
			.toThrow(`Found invalid category: "unknown"`);
	});

	it.each(["constructor", "toString", "valueOf", "hasOwnProperty", "__proto__"])("fails on the built-in object property %s as category", category =>
	{
		expect(() => parseInput(`* (${category}) Something`))
			.toThrow(`Found invalid category: "${category}"`);
	});

	it.each([
		["missing category", "* Something"],
		["missing bullet", "(bug) Something"],
		["missing content", "* (bug)"],
		["dash bullet", "- (bug) Something"],
		["plain text", "Something"],
	])("fails on a line with %s", (_, line) =>
	{
		expect(() => parseInput(line)).toThrow(`Could not parse line "${line}"`);
	});
});

describe("transformToMarkdown", () =>
{
	it("returns null if there are no entries", () =>
	{
		expect(render("")).toBeNull();
		expect(render("", true)).toBeNull();
	});

	it("renders a single category", () =>
	{
		expect(render("* (bug) Fix thing")).toBe([
			"## :bug: Bug Fixes",
			"",
			"*  Fix thing",
			"",
			"",
		].join("\n"));
	});

	it("renders categories in the defined order, regardless of input order", () =>
	{
		const input = [...Object.keys(CATEGORY_LABELS)]
			.reverse()
			.map(category => `* (${category}) Entry`)
			.join("\n");

		const headlines = render(input)
			.split("\n")
			.filter(line => line.startsWith("## "));

		expect(headlines).toEqual(Object.values(CATEGORY_LABELS).map(label => `## ${label}`));
	});

	it("puts security directly after new features", () =>
	{
		const output = render("* (bug) Bug\n* (security) Security\n* (feature) Feature");

		expect(output).toBe([
			"## :gift: New Features",
			"",
			"*  Feature",
			"",
			"",
			"## :shield: Security",
			"",
			"*  Security",
			"",
			"",
			"## :bug: Bug Fixes",
			"",
			"*  Bug",
			"",
			"",
		].join("\n"));
	});

	it("skips empty categories", () =>
	{
		const output = render("* (bc) Break\n* (internal) Refactor");

		expect(output).toContain("## :boom: Breaking Changes");
		expect(output).toContain("## :hammer_and_wrench: Internal");
		expect(output).not.toContain("## :gift: New Features");
	});

	it("renders multiple entries of the same category in one section", () =>
	{
		expect(render("* (bug) One\n* (bug) Two")).toBe([
			"## :bug: Bug Fixes",
			"",
			"*  One",
			"*  Two",
			"",
			"",
		].join("\n"));
	});

	it("keeps multi-line entries and nested lists inside the list item", () =>
	{
		expect(render("* (feature) Add page.\n  Requires a migration.\n  * nested")).toBe([
			"## :gift: New Features",
			"",
			"*  Add page.",
			"  Requires a migration.",
			"  * nested",
			"",
			"",
		].join("\n"));
	});

	it("adds a separator for the full (GitHub) output", () =>
	{
		expect(render("* (bug) Fix thing", true)).toBe([
			"## :bug: Bug Fixes",
			"",
			"*  Fix thing",
			"",
			"",
			"---",
			"",
			"",
		].join("\n"));
	});

	it("adds no separator for the GitLab output", () =>
	{
		expect(render("* (bug) Fix thing", false)).not.toContain("---");
	});
});
