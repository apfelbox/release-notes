Release Notes
=============

>   **Online available at [release-notes.jannik.io](https://release-notes.jannik.io/).**

Changelog Format
----------------

The entry must be a list. Every top-level list item must have the format:

```md
*   (type) text
```

where `type` is one of the types below and `text` is just free text.


### Supported Types

| Type              | Label                 | Description                       |
| ----------------- | --------------------- | --------------------------------- |
| `(bc)`            | **Breaking Changes**  | Changes that break previously working code. <u>Implies major version bump!</u> |
| `feature`         | **New Features**      | New features added, that add new functionality to the library. <u>Implies at least minor version bump!</u> |
| `(improvement)`   | **Improvements**      | Things that work better or in more cases than before. |
| `(bug)`           | **Bugfixes**          | Things that should have worked before (but didn't), but do work now. |
| `(deprecation)`   | **Deprecations**      | Lists all added deprecations. |
| `(docs)`          | **Documentation**     | Changes in the documentation. |
| `(internal)`      | **Internal**          | Internal changes / refactorings that should have no functional impact on the end user. |

