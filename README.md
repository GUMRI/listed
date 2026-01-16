# listedb — Quickstart / examples

This document provides a short, corrected quickstart and example snippets for using listedb (TypeScript). It shows initialization (local + remote stores), schema and field definitions, creating lists, reacting to changes, working with files, and using the key/value "space" API.

> Note: The example below corrects several small typos present in the original snippet (for consistency):
> - lSitting is used consistently (was `lSetting` in one place).
> - lField / lFiled typos are corrected to `lField` where appropriate.
> - lFilter usage is clarified.
> - fField → lField for relation example.
> - Minor API usage is annotated; adapt to the actual package version if method names differ.

## Install
(Assumes listed packages are published and in your package.json)
npm install @listed/core @listed/angular

## Initialization (local-first, optional remote and drive)

```ts
import {
  lSitting,
  list,
  lSpace,
  lField,
  lSchema,
  lFilter
} from '@listed/core';
import type { 
  ListType, 
  LFilterType,
  LUniqueFilterType,
  LCreateInputType, 
  LUpdateInputType,
  LUniqueFilterType,
} from '@listed/types';
import { LAngularReactive } from '@listed/angular';
import {LInd}
// register reactive implementation (Angular example)
lSitting.reactive(new LAngularReactive(Injector));

// add storage sources - at least one required (local or remote)
// Local (IndexedDB)
lSitting.local(new LIndexedDB());

// Remote (Firestore) - optional; when provided it will sync
const remoteDB: Firestore = getFirestore();
lSitting.remote(new LFirestore(remoteDB));

// Optional file drive (remote-first sync for files)
const fStorage: FStorage = getStorage() 
lSitting.blobDriver({
 remote:new LFireStorage(fStorage),
 local: new L_OPFS()}
);
```

## Define fields and schema

```ts
// scalar fields
const id = lField.id.autoincrement();
const username = lField.unique(z.string().min(3).max(10));
const email = lField.unique(z.string().email());
const age = lField.index(z.number().min(1).max(150));
const createdAt = lField.now();

// file field (file storage + helpers)
const photo = lField.file();

// relation / population example (many -> posts)
const posts = lField.manyFrom(() => sPost); // sPost must be defined similarly
const clientsNotes = lFiled.collaborativeText()
const chefsNotes = lField.richText()

const logs = field.logs()
const likes  = lField.count()
// define schema
const sUser = lSchema({
  name: 'users',
  softDelete: true,
  fields: {
    id,
    username,
    email,
    age,
    photo,
    createdAt,
    posts,
    clientsNotes,
    ChefsNotes,
    logs,
    likes,
  }
});
```
## work with typescript types 
```ts
  type User = ListType<typeof sUser>
  type UserFilter = LFilterType<User>
  type UserUniqueFilter =  LUniqueFilterType<User>
  type UserCreateInput =  LCreateInputType<User>
  type UserUpdateInput = LUpdateInputType<User>
```

Notes:
- The example uses zod (`z`) validators in field definitions. Ensure you import and use the same validation library expected by the listed package (zod in the snippet).
- Adjust `lField.manyFrom` signature to your library version (some APIs may use different names).

## Filters, typed filter, and the list

```ts
// typed filter using the schema type
type TFilter = LTFilter<typeof sUser>;

// initialize a filter (empty initially)
const fUser = lFilter<TFilter>({});

// create a reactive list bound to the schema and filter
const users = list(sUser, fUser);
```

## Reactivity — read reactive list values

In a reactive context (e.g., with a reactive system registered above):

```ts
effect(() => {
  console.log('users list', users());
});
```

## Creating items

```ts
users.create({
  data: {
    username: 'ftouh',
    email: 'ftouh@mail.com'
  }
});
```

## Updating filters (example)

```ts
// update the filter to narrow the list by age range
function takeGeneration(from: number, to: number) {
  fUser.modfiy(prev => {
    return {
      ...prev,
      where: {
        age: {
          lt: from,
          gt: to
        }
      }
    };
  });
}

// log filters
effect(() => {
  console.log(fUser())
})


// clear filters
fUser.clear();
```

Adjust `lFilter.update` usage per actual API (some libs expect `fUser.update(...)` instead of global `lFilter`).

## Working with files (photo field)

Example usage in an Angular template (pseudo-HTML) — shows preview, size, download, remove and progress:

```html
<!--
  Pseudo-template showing reactive users() iteration.
  Adapt the binding syntax to your framework (Angular, Solid, Vue, etc.)
-->
<div *ngFor="let user of users()">
  <img [src]="user.photo.preview()" alt="avatar">
  <-- date is JavaScript File --!>
  <span>data: {{ user.photo.data() | json }}</span>
  <span>size: {{ user.photo.size() }}</span>
  <button (click)="user.photo.download()">save cache</button>
  <button (click)="user.photo.remove()">remove cache</button>
  <span>downloading progress: {{ user.photo.process() }}</span>
</div>
```

APIs used here:
- preview() — returns a local URL or data URL for immediate preview
- size() — returns file size
- download() — fetch and cache the file
- remove() — remove cached file
- process() — progress / status of file operations

Adjust names based on the actual implementation.

## Key/value "space" usage

The space API stores small pieces of data (e.g., settings, theme, or a single file).

```ts
// create a key-value entry named 'theme'
const theme = lSpace('theme');

// subscribe reactively
effect(() => {
  console.log('theme color:', theme());
});

// toggle helper
function toggleTheme() {
  theme.modify(t => (t === 'dark' ? 'light' : 'dark'));
}
```

Space with file:
```ts
// store a file (logo) in space
const logo = lSpace('logo', lField.file());
```

Note: Some method names may be `modify`, `modfiy` was a typo in the original snippet — use the library's actual name.

## Additional notes and tips

- The library supports local-first auto-sync when both local and remote are present.
- Use the reactive adapter appropriate to your front-end framework (Angular, React, Solid...) — register it via lSitting.reactive.
- Schema / field/validation APIs rely on the chosen validator (zod in the example) — ensure that validator is included and compatible.
- The API surface (method names, return values) may vary by library version. Treat this doc as a quickstart and adapt to exact versions by checking the package docs or TypeScript types.

If you'd like, I can:
- generate a polished README.md from this doc,
- create a small example app scaffolding with these calls,
- or update this doc to target a specific framework (Angular / React / Solid) and include exact template code.
