# Video Block

## Overview

The Video block embeds one or more video links in a responsive 16:9 frame. A single URL renders as a standalone player, and multiple URLs automatically render as a carousel with previous/next controls, dot navigation, and autoplay.

## How It Works

- Authors paste one or more video URLs into the block.
- The block extracts YouTube video IDs and converts them to embeddable `youtube-nocookie.com` URLs.
- If more than one URL is authored, the block becomes a carousel automatically.
- Supported URL formats include standard watch links, `youtu.be` share links, `shorts`, `live`, and existing embed links.
- Non-YouTube HTTPS links are used directly as iframe sources, which is useful for already-embeddable player URLs.
- If a URL is invalid, the block shows an author-facing error message instead of a broken iframe.

## Files

- `video.js`: Parses authored URLs and renders either a single embed or a multi-slide carousel
- `video.css`: Styles the responsive frame, carousel controls, and indicator dots
- `_video.json`: Defines the DA authoring model with repeatable video items

## da.live Authoring

### Supported Field

- `videoUrl`: Paste a video URL into the Video block

### DA Usage

In `da.live`, add a Video block and populate the `videoUrl` field with a URL such as:

- `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ`
- `https://www.youtube.com/shorts/dQw4w9WgXcQ`

## Authoring Notes

- The default authoring shape is the original single-field `videoUrl` block.
- The carousel activates automatically when more than one valid video URL row is present in the rendered block.
- Existing single-video DA content remains supported.
- Use full YouTube links for the best experience; direct embeddable player URLs also work.
- The block scales responsively across desktop and mobile layouts.
- `video.da.html` contains the full DA document structure.
- `video.da.txt` contains the same markup as raw copyable text for pasting into `da.live`.
