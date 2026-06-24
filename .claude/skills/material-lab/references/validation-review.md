# Validation And Review

The surface is not validated when it merely looks good in one screenshot. Validate it under controlled variation.

## Required Checks

- neutral lighting still
- harsh lighting still
- one physics sanity note
- one alternate camera angle
- one branch-specific note if the material is scan-driven or SSS-driven
- one note about what remains wrong

## Review Questions

- Does the highlight width match the target?
- Does the edge response stay believable across angles?
- Do normal details hold up without sparkling?
- Do metalness, transmission, and thickness behave like the chosen material class?
- If this is a scan-driven material, does the result still look calibrated after the asset pipeline steps?
- If this is an SSS/translucency material, does the backlit read differ from the front-lit read in the expected way?
- Is post improving the read, or hiding a weak material?

## Acceptance Rule

Call the study complete only when the core surface cues survive at least two lighting conditions, one angle change, and a basic material-class sanity check.
