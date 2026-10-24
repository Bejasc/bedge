# Posting and the embed builder

Admins can post messages as BedgeBot or as a webhook **persona**, edit them later without reposting, save them as templates, and design richer ones in a browser-based builder. Every post and edit is logged in the *server* category.

## `/post`

`/post` opens a form with four fields:

| Field | Options |
|---|---|
| Channel | Any text, announcement or thread channel. Defaults to the current one |
| Post as | BedgeBot, or one of the server's personas |
| Format | **Text**, **Card** or **JSON** (below) |
| Content | Up to 4000 characters |

The formats:

- **Text** is a normal message, up to 2000 characters.
- **Card** wraps the text in a Components V2 card with the BedgeBot accent colour, up to 4000 characters.
- **JSON** is a raw Discord message payload with `content`, `embeds`, `components` and `flags`. If the components include Components V2 types, the right flag is set for you. Discord doesn't allow `content` or `embeds` alongside V2 components, so that combination is rejected with an explanation.

User mentions, role mentions and `@everyone` ping exactly as written.

> [!TIP] Nothing typed is lost
> If a post fails (bad JSON, too long, Discord refuses it), the error reply includes your content in a code block so you can copy it back.

## Personas

A persona is a name and an avatar that posts appear under, via a webhook.

| Command | What it does |
|---|---|
| `/persona add name [avatar_url]` | Adds or updates a persona. The avatar must be an `https` image URL |
| `/persona remove name` | Removes one |
| `/persona list` | Lists them |

BedgeBot creates one webhook per channel, named *BedgeBot Personas*, and reuses it for every persona. It needs *Manage Webhooks*.

## Editing a post

Right-click a message and pick *Apps → Edit bot message*. It works on anything BedgeBot posted, directly or as a persona. The form opens with the message's current content and a format worked out from the message: plain messages open as Text, simple cards as Card, everything else as JSON.

Discord limits these forms to 4000 characters. Anything longer has to go through the builder.

## Templates

A template is a saved format and content.

| How | What it does |
|---|---|
| *Apps → Save as template* on any message | Saves that message, under a name you give |
| `/template save name` | Writes a new template, or overwrites one, in the form |
| `/template list` / `/template delete name` | Manages them |
| `/post template:name` | Opens `/post` prefilled, so you can change it before sending |

## The embed builder

The builder is a web page served by the API at `/builder/`. It has a JSON editor on one side and a live, Discord-styled preview on the other. Snippet buttons drop in a text message, an embed, a Components V2 card, an embed field or a link button. The preview renders Discord markdown, mentions, timestamps, embeds and V2 layouts, and flags problems before you save.

*Save draft* returns an 8-character code. Drafts last 7 days, and anyone with the code can open it.

From Discord:

- `/post code:ABCD2345 [channel] [persona]` posts a draft straight away.
- *Apps → Open in builder* on any message saves it as a draft and replies with a builder link. If the message is one of BedgeBot's posts, the draft remembers it. Make your changes, save, then run `/post code:` with the new code. You'll be offered **Update original**, which edits the message in place, or **Post as new**.

`BUILDER_URL` must be set for the bot to link to the builder. See [Setup](setup.md#running-the-api).
