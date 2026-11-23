import {findFirst} from "@21torr/dune/dom/traverse";
import {on} from "@21torr/dune/dom/events";
import {parseInput, transformToMarkdown} from "./changelog";

const buttonGithub = findFirst<HTMLButtonElement>("#changelog-run-github");
const buttonGitlab = findFirst<HTMLButtonElement>("#changelog-run-gitlab");
const result = findFirst<HTMLDivElement>("#changelog-result");
const output = findFirst<HTMLDivElement>("#changelog-output");
const input = findFirst<HTMLTextAreaElement>("#changelog-input");

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
