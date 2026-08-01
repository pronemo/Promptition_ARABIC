/**
 * Promptition — Application Configuration
 * core/config.js
 *
 * Central, read-only configuration for the application. All site behaviour,
 * storage keys and collection metadata are declared here so pages and
 * components never hardcode magic strings.
 */

export const CONFIG = {
  site: {
    name: "Promptition",
    tagline: "The AI Resource Library",
    description:
      "Curated models, LoRAs, prompts, styles, tools, workflows and guides for the open diffusion ecosystem.",
    url: "https://promptition.example.com",
    version: "1.0.0",
  },

  storage: {
    theme: "promptition:theme",
    favorites: "promptition:favorites",
    history: "promptition:history",
    compare: "promptition:compare",
    settings: "promptition:settings",
  },

  limits: {
    history: 50,
    compare: 4,
    defaultPageSize: 12,
    pageSizes: [9, 12, 24, 48],
  },

  api: {
    baseDir: "assets/data",
    cacheTtl: 5 * 60 * 1000, // 5 minutes
    retries: 2,
    timeout: 8000,
    preloadOnIdle: true,
  },

  search: {
    debounceMs: 220,
    minChars: 2,
    maxResults: 30,
  },

  theme: {
    attr: "data-theme",
    default: "system", // 'light' | 'dark' | 'system'
  },

  /**
   * Collection registry — single source of truth for every content type.
   * Each entry describes where data lives, how detail pages are reached,
   * and which icon represents the collection in the UI.
   */
  collections: [
    {
      type: "models",
      label: "Models",
      singular: "Model",
      path: "models.html",
      detailPath: "model.html",
      data: "assets/data/models/index.json",
      dataDir: "assets/data/models",
      icon: "i-cpu",
      description:
        "Text-to-image and diffusion checkpoints with architectures, quantizations and download links.",
      sortable: ["popular", "rating", "newest", "downloads", "name"],
    },
    {
      type: "tools",
      label: "Tools",
      singular: "Tool",
      path: "tools.html",
      detailPath: "tool.html",
      data: "assets/data/tools/index.json",
      dataDir: "assets/data/tools",
      icon: "i-wrench",
      description:
        "Applications, libraries and trainers that power the diffusion ecosystem.",
      sortable: ["popular", "rating", "newest", "downloads", "name"],
    },
    {
      type: "loras",
      label: "LoRAs",
      singular: "LoRA",
      path: "loras.html",
      detailPath: "lora.html",
      data: "assets/data/loras/index.json",
      dataDir: "assets/data/loras",
      icon: "i-layers",
      description:
        "Lightweight fine-tunes for style, character and detail that drop into any workflow.",
      sortable: ["popular", "rating", "downloads", "name"],
    },
    {
      type: "prompts",
      label: "Prompts",
      singular: "Prompt",
      path: "prompts.html",
      detailPath: "prompt.html",
      data: "assets/data/prompts/index.json",
      dataDir: "assets/data/prompts",
      icon: "i-doc",
      description:
        "A copy-ready prompt library with positive, negative and generator settings.",
      sortable: ["popular", "rating", "used", "name"],
    },
    {
      type: "styles",
      label: "Styles",
      singular: "Style",
      path: "styles.html",
      detailPath: "style.html",
      data: "assets/data/styles/index.json",
      dataDir: "assets/data/styles",
      icon: "i-palette",
      description:
        "Recurring visual languages — append a style suffix to any prompt.",
      sortable: ["popular", "rating", "used", "name"],
    },
    {
      type: "workflows",
      label: "Workflows",
      singular: "Workflow",
      path: "workflows.html",
      detailPath: "workflow.html",
      data: "assets/data/workflows/index.json",
      dataDir: "assets/data/workflows",
      icon: "i-node",
      description:
        "Composable node graphs for ComfyUI — from basic generation to advanced conditioning.",
      sortable: ["popular", "rating", "downloads", "name"],
    },
    {
      type: "tutorials",
      label: "Tutorials",
      singular: "Tutorial",
      path: "tutorials.html",
      detailPath: "tutorial.html",
      data: "assets/data/tutorials/index.json",
      dataDir: "assets/data/tutorials",
      icon: "i-bookmark",
      description:
        "Step-by-step guides and long-form articles for every skill level.",
      sortable: ["popular", "rating", "newest", "name"],
    },
    {
      type: "datasets",
      label: "Datasets",
      singular: "Dataset",
      path: "datasets.html",
      detailPath: "dataset.html",
      data: "assets/data/datasets/index.json",
      dataDir: "assets/data/datasets",
      icon: "i-database",
      description:
        "Reference corpora used to train and fine-tune modern image models.",
      sortable: ["popular", "rating", "samples", "name"],
    },
    {
      type: "nodes",
      label: "Nodes",
      singular: "Node",
      path: "nodes.html",
      detailPath: "node.html",
      data: "assets/data/nodes/index.json",
      dataDir: "assets/data/nodes",
      icon: "i-code",
      description:
        "Custom ComfyUI node packs that extend the platform with new capabilities.",
      sortable: ["popular", "rating", "stars", "name"],
    },
  ],

  nav: [
    { label: "Models", path: "models.html", type: "models" },
    { label: "Tools", path: "tools.html", type: "tools" },
    { label: "LoRAs", path: "loras.html", type: "loras" },
    { label: "Prompts", path: "prompts.html", type: "prompts" },
    { label: "Styles", path: "styles.html", type: "styles" },
    { label: "Workflows", path: "workflows.html", type: "workflows" },
    { label: "Tutorials", path: "tutorials.html", type: "tutorials" },
    { label: "Datasets", path: "datasets.html", type: "datasets" },
    { label: "Nodes", path: "nodes.html", type: "nodes" },
  ],

  footer: {
    collections: [
      { label: "Models", path: "models.html" },
      { label: "LoRAs", path: "loras.html" },
      { label: "Prompts", path: "prompts.html" },
      { label: "Styles", path: "styles.html" },
    ],
    resources: [
      { label: "Tools", path: "tools.html" },
      { label: "Workflows", path: "workflows.html" },
      { label: "Datasets", path: "datasets.html" },
      { label: "Nodes", path: "nodes.html" },
    ],
    learn: [
      { label: "Tutorials", path: "tutorials.html" },
      { label: "Articles", path: "articles.html" },
      { label: "Compare", path: "compare.html" },
      { label: "Image Analyzer", path: "upload.html" },
      { label: "My Library", path: "gallery.html" },
      { label: "Search", path: "search.html" },
    ],
  },

  social: [
    { label: "GitHub", path: "https://github.com", icon: "i-github" },
    { label: "Twitter", path: "https://twitter.com", icon: "i-trending" },
  ],
};

/** Look up a collection config by its type key. */
export function getCollection(type) {
  return CONFIG.collections.find((c) => c.type === type) || null;
}

/** All collection types. */
export function allTypes() {
  return CONFIG.collections.map((c) => c.type);
}
