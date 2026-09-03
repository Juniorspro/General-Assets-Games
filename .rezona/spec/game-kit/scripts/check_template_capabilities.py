#!/usr/bin/env python3
"""Check game-kit projects for required platform capability anchors.

This is a positive smoke check for template maintenance. It complements
check_template_neutrality.py: neutrality prevents strong gameplay defaults from
creeping back in; this script guards the minimal runtime/platform capabilities
that each starter or generated workspace must continue to expose.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

VALID_MODES = ("2d", "ar", "vr", "3d")
TEMPLATES_ROOT = Path(__file__).resolve().parents[1] / "templates"
PROJECT_SUBDIR = "current"

Rule = tuple[re.Pattern[str], str]


MODE_RULES: dict[str, dict[str, list[Rule]]] = {
    "2d": {
        "src/App.tsx": [
            (re.compile(r"\buseScreen\s*\("), "2D App must keep screen sizing hook"),
            (re.compile(r"\buseInput\s*\("), "2D App must keep input hook"),
            (
                re.compile(r"\buseGameConfig\s*\(\s*SCHEMA\s*\)"),
                "2D App must keep editable config hook",
            ),
            (
                re.compile(r"\buseLoop\s*\(\s*canvasRef\s*,\s*phaseRef\s*,"),
                "2D App must keep canvas loop",
            ),
            (
                re.compile(r"\.\.\.\s*\{?\s*input\.handlers\s*\}?"),
                "2D App must attach input handlers",
            ),
            (
                re.compile(r"<canvas\b[^>]*ref=\{canvasRef\}"),
                "2D App must mount a canvasRef canvas",
            ),
        ],
        "src/game/controller.ts": [
            (
                re.compile(r"\btick\s*\("),
                "2D controller must expose a tick/update path",
            ),
        ],
        "src/game/systems/render.ts": [
            (
                re.compile(r"\bCanvasRenderingContext2D\b"),
                "2D render system must draw to CanvasRenderingContext2D",
            ),
        ],
    },
    "ar": {
        "src/App.tsx": [
            (
                re.compile(r"\bstartVision\s*\("),
                "AR App must start the camera/vision pipeline",
            ),
            (
                re.compile(r"\bstopVision\s*\("),
                "AR App must stop the camera/vision pipeline",
            ),
            (
                re.compile(r"\bvisionState\b"),
                "AR App must pass visionState into the game tick",
            ),
            (
                re.compile(r"<video\b[^>]*ref=\{videoRef\}"),
                "AR App must mount a camera video element",
            ),
            (
                re.compile(r"<canvas\b[^>]*ref=\{canvasRef\}"),
                "AR App must mount an overlay canvas",
            ),
            (
                re.compile(r"\bobjectFit:\s*'cover'"),
                "AR video must use object-fit:cover framing",
            ),
            (
                re.compile(r"\btransform:\s*'scaleX\(-1\)'"),
                "AR front camera preview must stay mirrored",
            ),
        ],
        "src/game/systems/render.ts": [
            (
                re.compile(r"\bclearRect\s*\("),
                "AR overlay render must clear instead of covering the camera",
            ),
            (
                re.compile(r"\bc\.vision\b"),
                "AR render system must expose vision data to drawing code",
            ),
            (
                re.compile(r"landmarksNorm"),
                "AR render guidance must keep landmark data visible to agents",
            ),
        ],
    },
    "vr": {
        "src/App.tsx": [
            (
                re.compile(r"from\s+['\"]@react-three/fiber['\"]"),
                "VR App must keep the R3F Canvas renderer",
            ),
            (re.compile(r"\buseVrViewControls\s*\("), "VR App must keep view controls"),
            (re.compile(r"\buseVrGestures\s*\("), "VR App must keep gesture controls"),
            (
                re.compile(r"\bmergePointerHandlers\s*\("),
                "VR App must merge input/view/gesture pointer handlers",
            ),
            (re.compile(r"<Canvas\b"), "VR App must mount Canvas"),
            (re.compile(r"<CameraRig\b"), "VR App must mount CameraRig"),
            (re.compile(r"<Scene\b"), "VR App must mount Scene"),
            (
                re.compile(r"gestureStateRef=\{gestureControls\.stateRef\}"),
                "VR App must pass gesture ref into Scene",
            ),
        ],
        "src/game/ui/Scene.tsx": [
            (re.compile(r"\buseFrame\s*\("), "VR Scene must keep the R3F frame loop"),
            (
                re.compile(r"<VrVirtualHands\b"),
                "VR Scene must keep virtual hands capability",
            ),
            (
                re.compile(r"\bgestures:\s*gestureStateRef\.current\b"),
                "VR Scene must pass gestures into game tick",
            ),
        ],
    },
    "3d": {
        "src/App.tsx": [
            (re.compile(r"\buseScreen\s*\("), "3D App must keep screen sizing hook"),
            (re.compile(r"\buseInput\s*\("), "3D App must keep input hook"),
            (
                re.compile(r"\buseGameConfig\s*\(\s*SCHEMA\s*\)"),
                "3D App must keep editable config hook",
            ),
            (
                re.compile(r"\.\.\.\s*\{?\s*input\.handlers\s*\}?"),
                "3D App must attach input handlers",
            ),
            (
                re.compile(r"<canvas\b[^>]*ref=\{canvasRef\}"),
                "3D App must mount a canvasRef canvas",
            ),
            (
                re.compile(r"startGame\s*\(\s*canvas\s*,"),
                "3D App must hand off to the three.js runtime",
            ),
        ],
        "src/three/game.ts": [
            (
                re.compile(r"new\s+(THREE\.)?WebGLRenderer\s*\("),
                "3D runtime must create the WebGLRenderer",
            ),
            (
                re.compile(r"\.render\s*\("),
                "3D runtime must render the scene",
            ),
            (
                re.compile(r"consumeTap\s*\("),
                "3D runtime must keep a user-gesture audio unlock path",
            ),
            (
                re.compile(r"window\.addEventListener\s*\(\s*['\"]resize['\"]"),
                "3D runtime must handle resize",
            ),
            (
                re.compile(r"window\.removeEventListener\s*\(\s*['\"]resize['\"]"),
                "3D runtime must remove resize listener",
            ),
        ],
    },
}


def check_project_capabilities(
    project: Path, mode: str, *, label: str | None = None
) -> list[str]:
    label = label or mode
    errors: list[str] = []
    if not project.is_dir():
        return [f"project not found: {project}"]

    for rel, rules in MODE_RULES[mode].items():
        path = project / rel
        if not path.is_file():
            errors.append(f"{label}/{rel}: file not found")
            continue
        text = path.read_text(encoding="utf-8")
        for pattern, message in rules:
            if not pattern.search(text):
                errors.append(f"{label}/{rel}: {message}")
    return errors


def check_template_mode(mode: str) -> list[str]:
    template = TEMPLATES_ROOT / mode
    if not template.is_dir():
        return [f"template not found: {template}"]
    return check_project_capabilities(template, mode, label=mode)


def check_workspace(workspace: Path, mode: str) -> list[str]:
    return check_project_capabilities(
        workspace / PROJECT_SUBDIR, mode, label=PROJECT_SUBDIR
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Check game-kit platform capabilities."
    )
    parser.add_argument("--mode", choices=VALID_MODES)
    parser.add_argument(
        "--workspace",
        help="Workspace container to check. When omitted, checks bundled starter templates.",
    )
    args = parser.parse_args()

    if args.workspace and not args.mode:
        parser.error("--workspace requires --mode")

    modes = [args.mode] if args.mode else list(VALID_MODES)
    errors: list[str] = []
    if args.workspace:
        errors.extend(check_workspace(Path(args.workspace), args.mode))
        target = f"workspace {args.workspace} ({args.mode})"
    else:
        for mode in modes:
            errors.extend(check_template_mode(mode))
        target = ", ".join(modes)

    if errors:
        print("capability check failed:")
        print("\n".join(f"- {error}" for error in errors))
        sys.exit(1)
    print(f"capability check passed for {target}")


if __name__ == "__main__":
    main()
