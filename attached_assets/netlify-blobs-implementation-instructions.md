---
applyTo: '**'
---
# Netlify Blobs Implementation Guide

Netlify Blobs provides object storage for unstructured data within your Netlify project. Use it to upload, retrieve, and list files (blobs) using a key-based system.


## Overview

Each blob belongs to a single site. A site can have multiple namespaces for blobs. We call these _stores_. This allows you to, for example, have the key `my-key` exist as an object in a store for `file-uploads` and separately as an object in a store for `json-uploads` with different data. Every blob must be associated with a store, even if a site is not using multiple namespaces.

You can perform CRUD operations for Netlify Blobs from the following Netlify features:

- [Functions](https://docs.netlify.com/functions/overview/)
- [Edge Functions](https://docs.netlify.com/edge-functions/overview/)
- [Build Plugins](https://docs.netlify.com/build-plugins/) - note that though a plugin can read from any stores on the site, a plugin can write to only [deploy-specific stores](https://docs.netlify.com/storage/blobs/overview/#deploy-specific-stores)
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) - visit the [CLI command reference](https://cli.netlify.com/commands/blobs/) for details

You can also:

- write to deploy-specific stores using [file-based uploads](https://docs.netlify.com/storage/blobs/overview/#file-based-uploads)
- browse and download blobs in the [Netlify Blobs UI](https://docs.netlify.com/storage/blobs/overview/#netlify-blobs-ui)

## Core Concepts

- **Store:** Logical container for blobs (e.g., "animals").
- **Key:** Unique identifier for each blob (e.g., "cats/shorthair.jpg").
- **Blobs:** The files or data being stored.
- **Directories:** Simulated via key prefixes (e.g., "cats/").

## Basic Usage

### 1. Import the Library

- **Netlify Functions or Edge Functions:**
  ```
  import { getStore } from "@netlify/blobs";
  ```
- **Build Plugins:**
  ```
  import { getDeployStore } from "@netlify/blobs";
  ```

### 2. Listing Blobs

- List all blobs in a store:
  ```
  const store = getStore("animals");
  const { blobs } = await store.list();
  // blobs: [{ etag, key }, ...]
  ```

- Example output:
  ```
  [
    { etag: "\"etag1\"", key: "cats/shorthair.jpg" },
    { etag: "\"etag2\"", key: "cats/longhair.jpg" },
    { etag: "\"etag3\"", key: "dogs/beagle.jpg" },
    { etag: "\"etag4\"", key: "dogs/corgi.jpg" },
    { etag: "\"etag5\"", key: "bird.jpg" }
  ]
  ```

### 3. Hierarchical Listing (Directories)

- List blobs and directories at the root:
  ```
  const { blobs, directories } = await store.list({ directories: true });
  // blobs: blobs at root, directories: ["cats", "dogs"]
  ```

- List contents of a specific directory:
  ```
  const { blobs, directories } = await store.list({ directories: true, prefix: "cats/" });
  // blobs: under "cats/", directories: subdirectories under "cats/"
  ```
  - **Note:** Always use a trailing slash in the prefix (e.g., "cats/") to avoid matching similar keys.

## Example: Netlify Function

```
import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const store = getStore("animals");
  const { blobs, directories } = await store.list({ directories: true, prefix: "cats/" });
  console.log(blobs); // [{ etag, key: "cats/shorthair.jpg" }, ...]
  console.log(directories); // []
  return new Response(`Found ${blobs.length} blobs and ${directories.length} directories`);
};
```

## Pagination

- The `list` method returns all keys by default. For large stores, consult the Netlify Blobs documentation for pagination options.

## Summary Table

| Function                | Purpose                                   | Example Usage                              |
|-------------------------|-------------------------------------------|--------------------------------------------|
| getStore("storeName")   | Access a store in functions/edge functions| `const store = getStore("animals")`        |
| getDeployStore("name")  | Access a store in build plugins           | `const store = getDeployStore("animals")`  |
| store.list()            | List blobs and directories                | `await store.list({ directories: true })`  |

## Important Notes

- Always end prefixes with a slash for correct directory matching.
- The API is available in Netlify Functions, Edge Functions, and Build Plugins.

For advanced usage and further details, refer to the official Netlify Blobs documentation.
```
