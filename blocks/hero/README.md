# Hero Block

## Overview

The Hero block renders a full-bleed image with a compact content panel layered on top. The image fills the block area, while the text content sits in a light translucent card so the main visual remains the primary focus.

This block is used for page-intro moments such as homepage banners, campaign highlights, or category entry points.

## How It Works

- The block looks for the first `picture` in the authored markup and treats it as the hero background image.
- All remaining authored content is collected into the foreground content panel.
- The image fills the full hero area with `object-fit: cover`, so it crops responsively to preserve visual impact across screen sizes.
- The content panel is aligned over the image and is intentionally narrower than the full block width.

## Files

- `hero.js`: Normalizes authored markup into `hero-media` and `hero-content`
- `hero.css`: Controls hero layout, overlay treatment, image sizing, and responsive behavior
- `_hero.json`: Defines the DA authoring model for this block

## da.live Authoring

### Supported Fields

The current DA model for this block supports these fields:

- `image`: The primary hero image
- `alt`: Alt text for the hero image
- `text`: The main heading text rendered as the hero title

### DA Structure

In `da.live`, authors should use the Hero block model and populate:

1. `image` with the main visual
2. `alt` with meaningful alternative text
3. `text` with the main headline

### Field Notes

- `image` should be a wide, high-quality asset because it fills the entire hero area.
- `alt` should describe the image content when the image conveys meaning. If the image is purely decorative, leave the alt text empty.
- `text` should stay fairly short for the best visual result. The current styling works best with a concise headline rather than a long sentence.

## Authoring Behavior and Limits

- The current DA model exposes only one text field, which maps to the hero heading.
- Supporting copy, CTA buttons, or extra rich text are not currently modeled in `_hero.json`.
- The block runtime can display additional non-image content if it is authored in raw markup, but that content is not part of the current DA field model.

If you want authors to manage body copy or buttons directly in `da.live`, the next step would be extending [\_hero.json](/Users/kmanns/Documents/Edge%20Delivery/seagate/blocks/hero/_hero.json) with additional fields.

## Best Practices

- Use landscape imagery with a clear focal point.
- Avoid placing critical image details at the extreme edges because responsive cropping may trim them.
- Keep headlines short and high impact.
- Make sure text remains readable against the chosen image.
