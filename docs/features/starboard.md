# Starboard

When a message collects enough star reactions, BedgeBot reposts it to the server's starboard channel. It keeps the star count on that post up to date, and removes the post if the count drops back below the threshold.

## Setting it up

In `/config`, open the *Starboard* section:

| Control | Default | Notes |
|---|---|---|
| Channel | none | Where starred messages are reposted |
| Enable / Disable | off | The board does nothing until it's on and has a channel |
| Threshold | 3 | Stars needed to post: 1–8, 10, 15, 20 or 25 |
| Set emoji | ⭐ | Any normal emoji, or one of the server's custom emoji. Paste it as `<:name:id>`; typing `\:name:` in chat shows that form |
| Self-stars | don't count | Whether the author's own reaction counts |

## What counts

Only reactions with the board's emoji count. Bots never count, and nor does the author unless self-stars are on.

Messages in the starboard channel itself and messages from bots are never posted. Messages from NSFW channels are posted only if the starboard channel is also NSFW.

## The starboard post

Each post shows the author's name and avatar, when and where the message was sent, its text, its first image, and the star count. A *Jump to message* button links to the original.
