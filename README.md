# Hangout SF

A San Francisco hangout planner. Describe your day by typing or talking, and it turns that into a timed schedule with real SF spots, live city events, and Muni directions between stops. Share it and your friends can edit the plan with you.

## Features

- **Plan by voice or text.** Say something like "brunch in the Mission, then a walk, then sunset somewhere." Claude builds a timeline with start and end times, places, and neighborhoods.
- **Made for SF.** Pick neighborhoods and vibes (Classic, Foodie, Outdoorsy, Artsy, Night out, Rainy day). Plans take hills, fog, and Muni into account. The app also works out sunset time for the date you pick.
- **Real events.** "Happening in SF" lists street fairs and festivals plus adult-friendly SF Public Library events for the next three weeks, pulled from DataSF open data. You can build a hangout around any event.
- **Transit-line timeline.** Each stop is a station on a line. Between stops you get the travel time, a warning if stops overlap, and a Muni directions link. The current stop is highlighted while the hangout is happening.
- **Edit together.** Friends can add, edit, or remove stops, or ask Claude to change the plan. Changes sync live.
- **Optional sharing.** Add friends' emails or phone numbers, then send the plan by email or text, or copy it as a link or plain text.
- **Ideas around SF.** A set of hand-picked starting points if you don't know what to do yet.

## How it works

The app is one HTML page (`index.html`) that runs as a [claude.ai](https://claude.ai) Artifact. It uses these Artifact runtime capabilities:

| Capability | Used for |
| --- | --- |
| `db` | Storing hangouts and their stops, synced live between friends |
| `sample` | Asking Claude to plan or revise the day |
| `dictation` | Voice input |
| `user` | Showing who's in a hangout |

Data model:

- `hangouts/{id}`: name, date, idea, invites, people, timestamps
- `hangouts/{id}/stops/{stopId}`: start, end, title, place, neighborhood, note

Routes are hash-based: `#new` opens the planner and `#h-<id>` opens a hangout.

## Events data

Artifacts can't call outside APIs, so events come from a snapshot file, `events.json`, published next to the page. `refresh-events.mjs` rebuilds it from two DataSF datasets:

- [Current and Upcoming Events based on Temporary Street Closures](https://data.sfgov.org/d/v9cz-kk5i) (special events only, minus conferences and construction)
- [Our415 Events and Activities](https://data.sfgov.org/d/8i3s-ih2a) (SF Public Library events for adults)

To refresh it (requires Node 18 or later):

```bash
node refresh-events.mjs
```

Then republish `events.json` alongside the page.

## Files

- `index.html`: the whole app (UI, planner, timeline, sharing)
- `refresh-events.mjs`: script that fetches upcoming SF events
- `events.json`: the latest events snapshot

## Notes

- Friends need a claude.ai account with access to the artifact to open or edit a shared hangout. "Copy as text" is the fallback for everyone else.
- Event data is © City and County of San Francisco, published through [DataSF](https://datasf.org) under its open data terms.
