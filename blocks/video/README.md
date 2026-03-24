# Video Block

## Overview

The Video block embeds a YouTube video from a pasted URL and renders it in a responsive 16:9 frame. The video player is wrapped in a Seagate green border so it matches the storefront brand system.

## How It Works

- Authors paste a YouTube URL into the block.
- The block extracts the YouTube video ID and converts it to an embeddable `youtube-nocookie.com` URL.
- Supported URL formats include standard watch links, `youtu.be` share links, `shorts`, `live`, and existing embed links.
- If the URL is invalid or not from YouTube, the block shows an author-facing error message instead of a broken iframe.

## Files

- `video.js`: Parses the authored URL and renders the iframe
- `video.css`: Styles the responsive frame and green border
- `_video.json`: Defines the DA authoring model

## da.live Authoring

### Supported Field

- `videoUrl`: Paste a full YouTube link

### DA Usage

In `da.live`, add a Video block and populate the `videoUrl` field with a YouTube URL, for example:

- `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ`
- `https://www.youtube.com/shorts/dQw4w9WgXcQ`

## Authoring Notes

- Use full YouTube links rather than pasted embed code.
- The block is intended for one video per block instance.
- The video automatically scales responsively across desktop and mobile layouts.
- A paste-ready DA block snippet is available in `video.da.html`.
