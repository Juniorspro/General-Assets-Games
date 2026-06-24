# Physics Sanity Checks

Use these checks to decide whether the prototype is physically plausible, intentionally stylized, or simply broken.

## Core Intuition Checks

- dielectrics should usually have neutral specular and meaningful diffuse
- metals should push energy into colored specular rather than diffuse
- transmission should not behave like plain alpha fade
- subsurface scattering should look like softened internal transport, not just transparent alpha or blurred refraction
- roughness should broaden highlights rather than only dim them
- fresnel should strengthen edge reflection without replacing the whole model

## Practical Sanity Pass

Run these before concluding that a material needs a custom shader:

1. set a neutral environment and check the base response
2. verify the material class choice
3. rotate the camera to inspect edge behavior
4. verify roughness under both hard and soft lighting
5. if transmission exists, test thickness and attenuation separately from opacity
6. if SSS or translucency exists, test a backlit thin-region shot separately from the front-lit read

## Known Anti-Patterns

- using `metalness` to fake glass reflectivity
- using `opacity` to fake physical glass
- using transmission to fake wax, skin, or leaf translucency when light diffusion is the actual cue
- using bloom to sell a weak specular response
- adding colored fresnel to rescue a misclassified material
- judging a surface from one screenshot only

## Honest Output Rule

If the material passes the artistic target but violates the physical intuition checks, label it `stylized` or `art-directed` instead of pretending it is physically correct.
