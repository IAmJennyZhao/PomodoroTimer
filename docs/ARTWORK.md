# Little Room artwork

The active artwork lives in `public/art/atelier/`, regenerated using the built-in `image_gen` tool to match the selected **04 Candy-Pastel Atelier** mockup. The medium is oil pastel and colored pencil on cream cotton paper: broken pigment, imperfect sketch edges, strawberry pink, pistachio green and faded cornflower blue. All labels and controls are real HTML, separate from the artwork.

The exact production prompts are saved in [atelier-art-prompts.json](atelier-art-prompts.json). The furniture prompt includes its final gutter correction. Original generated files remain in the image-generation folder; the app consumes copies committed inside this repository.

| Active asset | Use |
| --- | --- |
| `room-sunroom.png` | Bare apricot wall, warm wooden floor, right window and strawberry gingham curtain. |
| `room-moonroom.png` | The same shell in lavender evening colors. |
| `room-greenhouse.png` | The same shell in sage and cream garden colors. |
| `shop-backdrop.png` | Illustrated shop wall, counter, window, daisies and peripheral leaves. |
| `furniture-sheet.png` | Nine transparent movable decorations: couch, rug, bookshelf, window plants, table, side table, plant, cushion, books. |
| `animals-sheet.png` | Six transparent companions, in cat / dog / squirrel / rabbit / fox / deer order. |
| `eggs-sheet.png` | Four transparent patterned eggs: Basic daisies, Everyday hearts, Rare leaves, Dreamy stars. |
| `gumball-machine.png` | Strawberry machine with an empty plaque for interactive HTML controls. |
| `interface-sheet.png` | Transparent timer paper, strawberry button swatch, pedestal, egg cup, Daily goal note and accessories. |

`RoomBackdrop` renders the room PNG. `ArtFragment` uses SVG viewports solely to display selected PNG regions; it does not redraw or replace the illustrations. Furniture remains separate and movable. New rooms receive a removable Atelier furniture arrangement; only untouched legacy starter rooms receive it during migration. Custom arrangements and already-cleared rooms are preserved.

Pet upgrades retain their gentle animations; reduced-motion preferences disable movement. `public/favicon.svg` and the small control icons remain code-drawn for clarity.

## Earlier artwork archive

The five older raster assets in `public/art/` are retained as source references, but are no longer used by the app. The following briefs document their earlier generation.

The descriptions below summarize the generation briefs. They are not exact prompt transcripts. They contain no personal tasks, saved progress, or other private user data.

| Asset | Purpose and generation brief |
| --- | --- |
| `room-sunroom.png` | Full-screen sunlit reading nook: a cozy illustrated room, warm window light, plants and gentle pastel furnishings, with space for the timer and animal residents. |
| `room-moonroom.png` | Full-screen moonlit den: the same cozy illustrated visual world in quiet lavender and blue evening light, with a welcoming interior and room for the interface. |
| `room-greenhouse.png` | Full-screen garden room: a leafy greenhouse retreat with soft daylight, botanical shapes, pastel colors and an open area for the timer and residents. |
| `animals-sheet.png` | Transparent 3 × 2 sheet of six individual companions, ordered left to right, top to bottom: cat, dog, squirrel, rabbit, fox, deer. Soft illustrated forms, gentle expressions and pastel pencil texture. |
| `objects-sheet.png` | Transparent 3 × 2 sheet of collection and room objects, ordered left to right, top to bottom: everyday egg, rare egg, dreamy egg, leafy plant, cushion, book stack. Colors and texture match the animal companions and rooms. |


## Generation prompt set

The three room requests used this shared prompt, followed by the scene-specific text below. Each was generated with `transparent_background: false`.

> Generate an original background art asset for an immersive cozy animal-collecting Pomodoro website, landscape 1536x1024. Full bleed front-facing wide room illustration. Hand-rendered soft colored pencil with visible fine hatching over matte pastel gouache, warm cream paper texture, lavender violet shadows, coral pink highlights, butter-yellow accents. Sophisticated storybook illustration, not photorealistic, not 3D, not pixel art. The center upper half must be a low-detail pale wall area for a timer overlay. Most furniture around the perimeter with ample empty rug/floor across the lower third to place separate animal sprites. No animals, no people, no interface, no clocks, no text, no letters, no watermarks. Beautiful light, gentle natural shapes, harmonized inviting palette.

### Sunroom

> A sunlit cream-and-lavender cottage room. Large arched garden window at far left, outside blurred flowering garden. Low coral sofa toward right with lavender cushion, plants hanging in top corners, curved wooden bookshelf at far right. A small side table near left with teacup and flowers. Pale apricot oak floor and broad lavender oval woven rug across bottom foreground. Golden afternoon sunlight from left. Keep top center wall pale spacious and free of objects. Camera looks straight across the room rather than top down.

### Moonroom

> A cozy twilight lavender bedroom/study. Arched window at far left reveals indigo dusk sky with crescent moon and tiny stars, plum curtains. Rose-pink couch on right, small warm glowing shaded lamp, lavender bookshelves, hanging plants. Pale mauve floor, blue-lavender oval rug in bottom foreground. Center upper wall soft muted lilac and uncluttered. Dreamy dusk but light enough to clearly see room, a warm restful illustrated space.

### Greenhouse

> A cozy pastel conservatory reading room. Tall pale sage arched window frames along perimeter with flowering garden outside, large trailing leafy plants and small yellow flowers near corners, pink low wicker loveseat on right, ceramic pots grouped at edges. Light sage and cream walls, pale stone floor, buttery yellow and lavender woven oval rug across bottom. Gentle fresh morning sun. Quiet low-detail pale cream upper middle for timer overlay.

### Animal sheet

Generated with `transparent_background: true`.

> Asset type: transparent game sprite sheet. Generate six separate original pastel illustrated animal cutouts in a STRICT EQUAL 3-COLUMN BY 2-ROW GRID on a genuinely transparent background, canvas1536x1024. Each cell512x512. Order TOP ROW: cat, dog, squirrel. BOTTOM ROW: rabbit, fox, deer. Each animal centered in its own cell, fully contained with at least65px transparent padding on all edges, same apparent size. Animals have soft expressive faces and visible hand-drawn pencil hatching layered over pastel gouache, lavender/purple shadows, cream fur with coral pink, soft brown or butter yellow accents. Real recognizable anatomy gently simplified for storybook charm; NOT chibi emoji, NOT 3D, NOT photo, NOT pixel art. Cat: sitting upright calico cat with pink/lavender patches. Dog: seated floppy-eared cream spaniel, paws together. Squirrel: sitting holding an acorn with big fluffy curled tail. Rabbit: sitting round cream bunny with pink inner ears. Fox: sitting peach fox with big lavender-shadowed tail. Deer: seated tiny fawn with cream spots. Each animal entirely isolated, no ground plane, no floor, no foliage, no props other than squirrel's acorn, no labels, no shadows extending between cells, no accessories. True transparent alpha.

### Object sheet

Generated with `transparent_background: true`.

> Asset type: transparent illustrated game item sprite sheet. Six separate pastel objects in STRICT EQUAL 3-COLUMN BY 2-ROW GRID on genuinely transparent background, canvas1536x1024, cells512x512. At least80px transparent padding inside each cell, objects centered and never touching. TOP ROW: one cream egg with coral botanical speckles; one lavender rare egg with gold small stars and ribbon; one dreamy pearl-pink egg with tiny moon and iridescent lavender spots. BOTTOM ROW: leafy houseplant in rounded coral ceramic pot; plush lavender floor cushion with a tiny flower embroidery; a stack of three pastel books tied with soft pink ribbon. Cohesive storybook hand-drawn colored pencil and matte gouache, textured lavender hatching, coral pink cream and butter-yellow accents. No text, no letters, no animals, no background, no grid lines, no panels, no watermark, no scenery. Each object independent clear silhouette. True transparent alpha.
