#!/usr/bin/env python3
"""
Scaffold an effect folder from the replicator template.
"""

from __future__ import annotations

import argparse
import json
import re
import shlex
import shutil
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from workflow_schema import format_option_list, workflow_defaults, workflow_option_lists

DEFAULT_RUNTIME_VERSIONS = {
    "three": "0.180.0",
    "lil_gui": "0.20",
}

TEXT_SUFFIXES = {
    ".css",
    ".frag",
    ".glsl",
    ".html",
    ".js",
    ".json",
    ".md",
    ".txt",
    ".vert",
}
BACKENDS = {"webgpu", "webgl2", "auto"}
SHADER_MODES = {"tsl", "legacy", "auto"}
PROFILE_PRESETS = {
    "material-study": {
        "effect_archetype": "material-study",
        "resource_model": "uniforms",
        "pass_topology": "single-pass-material",
        "post_pipeline_type": "none",
        "render_target_layout": "backbuffer-only",
        "history_requirement": "none",
        "target_device_class": "laptop-balanced",
        "performance_contract": "balanced",
        "dominant_bottleneck": "unknown",
        "first_pass": "Lock the hero material on a simple mesh before adding post or scene polish.",
        "nearest_rejected_route": "scene-post",
        "suggested_modules": [
            "surface response",
            "lighting response",
            "palette and contrast",
            "micro detail",
        ],
        "quality_ladder": [
            "lower DPR",
            "reduce secondary polish",
            "reduce fine noise detail",
        ],
    },
    "scene-post": {
        "effect_archetype": "scene-post",
        "resource_model": "uniforms",
        "pass_topology": "scene-plus-post",
        "post_pipeline_type": "scene-polish",
        "render_target_layout": "single-intermediate",
        "history_requirement": "none",
        "target_device_class": "laptop-balanced",
        "performance_contract": "balanced",
        "dominant_bottleneck": "post-chain",
        "first_pass": "Make the base scene read correctly before tuning bloom, grade, or atmosphere polish.",
        "nearest_rejected_route": "material-study",
        "suggested_modules": [
            "scene composition",
            "surface and lighting",
            "atmosphere depth",
            "post polish",
        ],
        "quality_ladder": [
            "lower post resolution",
            "shorten secondary post passes",
            "reduce bloom radius or intensity",
        ],
    },
    "fullscreen-raymarch": {
        "effect_archetype": "fullscreen-raymarch",
        "resource_model": "uniforms",
        "pass_topology": "fullscreen-procedural",
        "post_pipeline_type": "fullscreen-stack",
        "render_target_layout": "single-intermediate",
        "history_requirement": "optional",
        "target_device_class": "desktop-mid",
        "performance_contract": "balanced",
        "dominant_bottleneck": "ray-steps",
        "first_pass": "Get silhouette, camera framing, and motion rhythm right before adding expensive polish loops.",
        "nearest_rejected_route": "feedback-trails",
        "suggested_modules": [
            "shape generation",
            "raymarch lighting",
            "atmosphere and fog",
            "screen-space polish",
        ],
        "quality_ladder": [
            "lower DPR",
            "reduce max steps",
            "reduce shadow or AO loops",
            "trim secondary post polish",
        ],
    },
    "instanced-particles": {
        "effect_archetype": "instanced-particles",
        "resource_model": "instanced-attributes",
        "pass_topology": "scene-plus-post",
        "post_pipeline_type": "scene-polish",
        "render_target_layout": "single-intermediate",
        "history_requirement": "optional",
        "target_device_class": "desktop-mid",
        "performance_contract": "balanced",
        "dominant_bottleneck": "particle-count",
        "first_pass": "Match field motion, density, and composition before tuning secondary glow or grade.",
        "nearest_rejected_route": "feedback-trails",
        "suggested_modules": [
            "spawn and distribution",
            "motion field",
            "particle shading",
            "post polish",
        ],
        "quality_ladder": [
            "reduce count or spawn rate",
            "reduce simulation resolution",
            "trim post quality",
        ],
    },
    "feedback-trails": {
        "effect_archetype": "feedback-trails",
        "resource_model": "render-target-history",
        "pass_topology": "feedback-loop",
        "post_pipeline_type": "feedback-post",
        "render_target_layout": "ping-pong-history",
        "history_requirement": "required",
        "target_device_class": "desktop-mid",
        "performance_contract": "balanced",
        "dominant_bottleneck": "bandwidth",
        "first_pass": "Stabilize the history update and decay behavior before layering extra blur, glow, or color polish.",
        "nearest_rejected_route": "scene-post",
        "suggested_modules": [
            "history update",
            "feedback decay",
            "composite pass",
            "post finish",
        ],
        "quality_ladder": [
            "lower feedback resolution",
            "reduce blur radius",
            "reduce persistence length",
            "trim secondary post polish",
        ],
    },
}
PROFILE_ALIASES = {
    "basic": "scene-post",
    "post": "scene-post",
    "particles": "instanced-particles",
    "material": "material-study",
    "raymarch": "fullscreen-raymarch",
    "feedback": "feedback-trails",
}
PROFILES = tuple(sorted(set(PROFILE_PRESETS) | set(PROFILE_ALIASES)))
TEMPLATE_BY_KEY = {
    ("tsl", "webgpu"): "tsl-webgpu",
    ("tsl", "webgl2"): "tsl-webgl2",
    ("legacy", "webgl2"): "legacy-glsl",
}
REVIEW_ARTIFACTS_DIRNAME = "review-artifacts"
WORKFLOW_DEFAULTS = workflow_defaults()
WORKFLOW_OPTION_LISTS = workflow_option_lists()
STATUS_LABELS = WORKFLOW_OPTION_LISTS["status_labels"]
MODE_CONTRACTS = WORKFLOW_OPTION_LISTS["mode_contracts"]
REFERENCE_ACCESS_GATES = WORKFLOW_OPTION_LISTS["reference_access_gates"]
REVIEW_ARTIFACT_GATES = WORKFLOW_OPTION_LISTS["review_artifact_gates"]
REVIEW_ARTIFACT_TYPES = WORKFLOW_OPTION_LISTS["review_artifact_types"]
ACCEPTED_SOURCE_TYPES = WORKFLOW_OPTION_LISTS["accepted_source_types"]
SOURCE_ROLES = WORKFLOW_OPTION_LISTS["source_roles"]


def load_runtime_versions() -> dict[str, str]:
    skill_root = Path(__file__).resolve().parent.parent
    versions_path = skill_root / "assets" / "runtime-versions.json"
    if not versions_path.exists():
        return dict(DEFAULT_RUNTIME_VERSIONS)

    data = json.loads(versions_path.read_text())
    versions = dict(DEFAULT_RUNTIME_VERSIONS)
    for key in versions:
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            versions[key] = value.strip()
    return versions


RUNTIME_VERSIONS = load_runtime_versions()
THREE_VERSION = RUNTIME_VERSIONS["three"]
LIL_GUI_VERSION = RUNTIME_VERSIONS["lil_gui"]


def normalize_slug(raw: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", raw.strip().lower())
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    if not slug:
        raise ValueError("effect slug is empty after normalization")
    return slug


def title_from_slug(slug: str) -> str:
    return " ".join(part.capitalize() for part in slug.split("-"))


def resolve_profile(profile: str) -> tuple[str, dict[str, object], str | None]:
    canonical_profile = PROFILE_ALIASES.get(profile, profile)
    preset = PROFILE_PRESETS.get(canonical_profile)
    if preset is None:
        raise ValueError(f"unknown profile: {profile}")
    alias = profile if profile != canonical_profile else None
    return canonical_profile, preset, alias


def replace_tokens(path: Path, replacements: dict[str, str]) -> None:
    if path.suffix not in TEXT_SUFFIXES and path.name not in {".gitignore", ".gitattributes"}:
        return
    text = path.read_text()
    for source, target in replacements.items():
        text = text.replace(source, target)
    path.write_text(text)


def resolve_generation_mode(shader: str, backend: str) -> tuple[str, str, str]:
    resolved_shader = "tsl" if shader == "auto" else shader
    resolved_backend = "webgpu" if backend == "auto" else backend

    if resolved_shader == "legacy" and resolved_backend == "webgpu":
        raise ValueError("legacy shader mode only supports the webgl2 backend")

    template_name = TEMPLATE_BY_KEY.get((resolved_shader, resolved_backend))
    if template_name is None:
        raise ValueError(
            f"no template available for shader={resolved_shader} backend={resolved_backend}"
        )

    return resolved_shader, resolved_backend, template_name


def write_supporting_files(
    effect_dir: Path,
    slug: str,
    title: str,
    shader: str,
    backend: str,
    requested_profile: str,
) -> None:
    review_artifacts_dir = effect_dir / REVIEW_ARTIFACTS_DIRNAME
    research_dir = effect_dir / "research"
    review_artifacts_dir.mkdir(exist_ok=True)
    research_dir.mkdir(exist_ok=True)
    (review_artifacts_dir / ".gitkeep").write_text("")

    canonical_profile, preset, alias = resolve_profile(requested_profile)
    effect_archetype = str(preset["effect_archetype"])
    resource_model = str(preset["resource_model"])
    pass_topology = str(preset["pass_topology"])
    post_pipeline_type = str(preset["post_pipeline_type"])
    render_target_layout = str(preset["render_target_layout"])
    history_requirement = str(preset["history_requirement"])
    target_device_class = str(preset["target_device_class"])
    performance_contract = str(preset["performance_contract"])
    dominant_bottleneck = str(preset["dominant_bottleneck"])
    first_pass = str(preset["first_pass"])
    nearest_rejected_route = str(preset["nearest_rejected_route"])
    suggested_modules = [str(item) for item in preset["suggested_modules"]]
    quality_ladder = [str(item) for item in preset["quality_ladder"]]

    authoring_path = "pure-tsl" if shader == "tsl" else "raw-glsl"
    runtime_renderer = "webgpu-renderer" if backend == "webgpu" else "webgl-renderer"
    compatibility_contract = (
        "desktop-webgpu-plus-webgl2-fallback" if backend == "webgpu" else "webgl2-first"
    )
    defaults = WORKFLOW_DEFAULTS

    capture_checklist = """# Review Artifact Checklist

## Gate Checks

- Reference access gate: `TODO`
- Mode contract: `TODO`
- Honest status label before review: `TODO`
- Browser validation gate: `TODO`
- Review artifact gate: `TODO`

- Use still pairs only when framing, silhouette, palette, or finish are the main questions.
- Use a short clip, GIF, or keyframe set when motion or camera behavior matters more than a single frame.
- Add a short note when interaction fidelity is central and files alone are not enough.
- Example still pair: `review-artifacts/reference-01.png` and `review-artifacts/current-01.png`
- Example motion pair: `review-artifacts/reference-motion.webm` and `review-artifacts/current-motion.webm`

## Fidelity Rubric

| Category | Score (0-2) | Gap | Notes |
| --- | --- | --- | --- |
| Silhouette | `TODO` | `TODO` | `TODO` |
| Motion | `TODO` | `TODO` | `TODO` |
| Density | `TODO` | `TODO` | `TODO` |
| Palette | `TODO` | `TODO` | `TODO` |
| Finish | `TODO` | `TODO` | `TODO` |

- Total fidelity score: `TODO/10`
- Acceptance target: `8/10`
"""
    (review_artifacts_dir / "checklist.md").write_text(capture_checklist)

    summary_lines = [
        f"# {title} Research Summary",
        "",
        f"- Effect slug: `{slug}`",
        f"- Effect archetype: `{effect_archetype}`",
        f"- Starter profile: `{canonical_profile}`",
        f"- Authoring path: `{authoring_path}`",
        f"- Runtime renderer: `{runtime_renderer}`",
        f"- Resource model: `{resource_model}`",
        f"- Pass topology: `{pass_topology}`",
        f"- Compatibility contract: `{compatibility_contract}`",
        f"- Target device class: `{target_device_class}`",
        f"- Performance contract: `{performance_contract}`",
        f"- Dominant bottleneck: `{dominant_bottleneck}`",
        f"- Post pipeline type: `{post_pipeline_type}`",
        f"- Render-target layout: `{render_target_layout}`",
        f"- History requirement: `{history_requirement}`",
        f"- Three.js version: `{THREE_VERSION}`",
        f"- lil-gui version: `{LIL_GUI_VERSION}`",
        f"- Profile: `{requested_profile}`",
        f"- Target environment: `{defaults['target_environment']}`",
        f"- Performance priority: `{defaults['performance_priority']}`",
        f"- Status: `{defaults['status_label']}`",
        f"- Mode contract: `{defaults['mode_contract']}`",
        f"- Reference access gate: `{defaults['reference_access_gate']}`",
        f"- Primary visual artifact: `{defaults['primary_visual_artifact']}`",
        f"- Classic graphics baseline: `{defaults['classic_graphics_baseline']}`",
        f"- First-frame review gate: `{defaults['first_frame_gate']}`",
        f"- Browser validation gate: `{defaults['browser_validation_gate']}`",
        f"- Review artifact gate: `{defaults['review_artifact_gate']}`",
        f"- Review artifact type: `{defaults['review_artifact_type']}`",
        "",
        "## Notes",
        "",
        "- Search canonical and mainstream graphics sources first, then engine references, then the Three.js landing path.",
        "- Do not start a faithful remake until an accessible primary visual artifact is locked.",
        "- If the reference gate fails, request stronger evidence or explicitly downgrade the mode contract.",
        "- Do not force still-image comparison for motion-heavy or interaction-heavy 3D scenes.",
        "- Pick the review artifact medium that actually represents the effect: stills, clips, GIFs, keyframes, or concise notes.",
        "- Use AskUserOption for unresolved product-level tradeoffs such as renderer contract, fidelity target, or compatibility scope.",
        "- Delegate bounded research work such as source parsing, link-tree expansion, and pitfall scans to subagents when it speeds up coverage.",
        "- Validate the final implementation surface against the official Three.js docs before sign-off.",
        "- Add the link tree, search terms, and implementation takeaways here.",
        "- Mirror the final internal implementation-surface decision, post-pipeline decision, performance contract, and fallback path in `../REPORT.md`.",
        "",
        "## Input Intake",
        "",
        "- Accepted source kinds: " + ", ".join(f"`{item}`" for item in ACCEPTED_SOURCE_TYPES) + ".",
        "- Normalize each source into one role: " + ", ".join(f"`{item}`" for item in SOURCE_ROLES) + ".",
        "- For keyword-only or image-only starts, record the English search phrases that produced the chosen primary reference.",
        "- Treat product copy, titles, and SEO summaries as insufficient evidence for a faithful route.",
        "",
        "## Suggested Route",
        "",
        f"- First pass: {first_pass}",
        f"- Nearest rejected route: `{nearest_rejected_route}`",
    ]
    if alias:
        summary_lines.append(f"- Alias used: `{alias}` -> `{canonical_profile}`")

    summary_lines.extend(
        [
            "",
            "## Suggested Modules",
            "",
            *[f"- {module}" for module in suggested_modules],
            "",
            "## Suggested Quality Ladder",
            "",
            *[f"- {step}" for step in quality_ladder],
            "",
        ]
    )
    (research_dir / "summary.md").write_text("\n".join(summary_lines))

    sources = {
        "effect_slug": slug,
        "effect_title": title,
        "effect_archetype": effect_archetype,
        "requested_profile": requested_profile,
        "canonical_profile": canonical_profile,
        "authoring_path": authoring_path,
        "runtime_renderer": runtime_renderer,
        "resource_model": resource_model,
        "pass_topology": pass_topology,
        "compatibility_contract": compatibility_contract,
        "target_device_class": target_device_class,
        "performance_contract": performance_contract,
        "dominant_bottleneck": dominant_bottleneck,
        "post_pipeline_type": post_pipeline_type,
        "render_target_layout": render_target_layout,
        "history_requirement": history_requirement,
        "three_version": THREE_VERSION,
        "lil_gui_version": LIL_GUI_VERSION,
        "profile": canonical_profile,
        "profile_alias": alias,
        "nearest_rejected_route": nearest_rejected_route,
        "suggested_modules": suggested_modules,
        "quality_ladder": quality_ladder,
        "target_environment": defaults["target_environment"],
        "performance_priority": defaults["performance_priority"],
        "mode_contract": defaults["mode_contract"],
        "status_label": defaults["status_label"],
        "reference_access_gate": defaults["reference_access_gate"],
        "primary_visual_artifact": defaults["primary_visual_artifact"],
        "classic_graphics_baseline": defaults["classic_graphics_baseline"],
        "first_frame_gate": defaults["first_frame_gate"],
        "browser_validation_gate": defaults["browser_validation_gate"],
        "review_artifact_gate": defaults["review_artifact_gate"],
        "review_artifact_type": defaults["review_artifact_type"],
        "user_decision_log": [],
        "delegated_research": [],
        "accepted_source_types": ACCEPTED_SOURCE_TYPES,
        "source_roles": SOURCE_ROLES,
        "sources": [],
    }
    (research_dir / "sources.json").write_text(json.dumps(sources, indent=2) + "\n")


def scaffold_effect(
    slug: str,
    title: str,
    output_root: Path,
    shader: str,
    backend: str,
    profile: str,
) -> Path:
    skill_root = Path(__file__).resolve().parent.parent
    canonical_profile, _, _ = resolve_profile(profile)
    resolved_shader, resolved_backend, template_name = resolve_generation_mode(shader, backend)
    template_dir = skill_root / "assets" / "templates" / template_name
    report_template = skill_root / "assets" / "report-template.md"
    effect_dir = output_root / "effects" / slug

    if effect_dir.exists():
        raise FileExistsError(f"output directory already exists: {effect_dir}")

    effect_dir.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(template_dir, effect_dir)

    replacements = {
        "__EFFECT_SLUG__": slug,
        "__EFFECT_TITLE__": title,
        "__BACKEND__": resolved_backend,
        "__SHADER_LANGUAGE__": resolved_shader,
        "__PROFILE__": canonical_profile,
        "__THREE_VERSION__": THREE_VERSION,
        "__LIL_GUI_VERSION__": LIL_GUI_VERSION,
        "__STATUS_LABEL_OPTIONS__": format_option_list(STATUS_LABELS),
        "__MODE_CONTRACT_OPTIONS__": format_option_list(MODE_CONTRACTS),
        "__REFERENCE_ACCESS_GATE_OPTIONS__": format_option_list(REFERENCE_ACCESS_GATES),
        "__REVIEW_ARTIFACT_GATE_OPTIONS__": format_option_list(REVIEW_ARTIFACT_GATES),
        "__REVIEW_ARTIFACT_TYPE_OPTIONS__": format_option_list(REVIEW_ARTIFACT_TYPES),
        "__ACCEPTED_SOURCE_TYPE_OPTIONS__": format_option_list(ACCEPTED_SOURCE_TYPES),
        "__SOURCE_ROLE_OPTIONS__": format_option_list(SOURCE_ROLES),
    }

    for path in effect_dir.rglob("*"):
        if path.is_file():
            replace_tokens(path, replacements)

    report_text = report_template.read_text()
    for source, target in replacements.items():
        report_text = report_text.replace(source, target)
    (effect_dir / "REPORT.md").write_text(report_text)
    write_supporting_files(effect_dir, slug, title, resolved_shader, resolved_backend, profile)

    return effect_dir


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create effects/<slug>/ from the bundled template.",
    )
    parser.add_argument("effect_slug", help="Effect name or slug")
    parser.add_argument(
        "--title",
        help="Optional human-readable title. Defaults to a title-cased version of the slug.",
    )
    parser.add_argument(
        "--backend",
        default="auto",
        choices=sorted(BACKENDS),
        help="Runtime backend to scaffold. Defaults to auto, which currently prefers webgpu.",
    )
    parser.add_argument(
        "--shader",
        default="auto",
        choices=sorted(SHADER_MODES),
        help="Shader authoring mode. Defaults to auto, which currently resolves to tsl.",
    )
    parser.add_argument(
        "--profile",
        default="basic",
        choices=sorted(PROFILES),
        help="Starter archetype profile or backward-compatible alias to record in the generated research files.",
    )
    parser.add_argument(
        "--output",
        default=".",
        help="Project root where the effects/ directory should be created. Defaults to the current directory.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        slug = normalize_slug(args.effect_slug)
    except ValueError as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1

    title = args.title.strip() if args.title else title_from_slug(slug)
    output_root = Path(args.output).resolve()

    try:
        effect_dir = scaffold_effect(
            slug,
            title,
            output_root,
            args.shader,
            args.backend,
            args.profile,
        )
    except (FileExistsError, ValueError) as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1

    server_root = output_root
    preview_url = f"http://localhost:4173/effects/{slug}/"
    print(f"[OK] Created {effect_dir}")
    print("[OK] Update REPORT.md and research/summary.md first, then replace the inline starter scene in index.html")
    print(f"[OK] Preview with: python3 -m http.server 4173 -d {shlex.quote(str(server_root))}")
    print(f"[OK] Then open: {preview_url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
